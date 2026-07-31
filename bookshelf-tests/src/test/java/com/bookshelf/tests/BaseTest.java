package com.bookshelf.tests;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.LockSupport;

import org.testng.annotations.AfterSuite;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.BeforeSuite;
import org.testng.annotations.DataProvider;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;

public class BaseTest {

    private static final String PASSWORD = "Passw0rd!";
    private static final String BASE_USER_EMAIL = "bookshelf-test-" + UUID.randomUUID() + "@example.com";
    private static final String BASE_URL = "http://localhost:8080";
    private static final Duration STARTUP_TIMEOUT = Duration.ofMinutes(2);
        private static final String ADMIN_EMAIL = System.getProperty("bookshelf.admin.email",
            "admin@gmail.com");
        private static final String ADMIN_PASSWORD = System.getProperty("bookshelf.admin.password", "Admin1234");
        private static final Path BACKEND_LOG_PATH = Path.of(System.getProperty("java.io.tmpdir"), "bookshelf-test-server.log");

    private static String authToken;
    private static Process backendProcess;
    private static boolean backendStartedBySuite;
        private static final Set<Long> createdBookIds = ConcurrentHashMap.newKeySet();

    @BeforeSuite(alwaysRun = true)
    public void ensureBackendRunning() {
        RestAssured.baseURI = BASE_URL;
        if (isBackendAvailable()) {
            return;
        }

        startBackendProcess();
        waitForBackend();
    }

    @BeforeClass(alwaysRun = true)
    public void configureBaseClient() {
        RestAssured.baseURI = BASE_URL;
        if (authToken == null) {
            authToken = registerAndLogin(BASE_USER_EMAIL, PASSWORD);
        }
    }

    @AfterSuite(alwaysRun = true)
    public void stopManagedBackend() {
        cleanupTestData();
        authToken = null;
        if (backendProcess == null || !backendStartedBySuite) {
            return;
        }

        backendProcess.destroy();
        try {
            backendProcess.waitFor();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        } finally {
            backendProcess = null;
            backendStartedBySuite = false;
        }
    }

    protected static String getAuthToken() {
        if (authToken == null) {
            authToken = registerAndLogin(BASE_USER_EMAIL, PASSWORD);
        }
        return authToken;
    }

    protected static String createUniqueEmail(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@example.com";
    }

    protected static String getDefaultPassword() {
        return PASSWORD;
    }

    @DataProvider(name = "missingAuthFields")
    public static Object[][] missingAuthFields() {
        return new Object[][] {
                { null, "Passw0rd!", 400 },
                { createUniqueEmail("missing-password"), null, 400 },
                { null, null, 400 }
        };
    }

    protected static String registerAndLogin(String email, String password) {
        registerUser(email, password);
        return loginUser(email, password);
    }

    protected static String usernameFromEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "user-" + UUID.randomUUID();
        }
        return email.substring(0, email.indexOf('@'));
    }

    protected static Map<String, Object> authPayload(String email, String password) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("email", email);
        payload.put("username", usernameFromEmail(email));
        payload.put("password", password);
        return payload;
    }

    protected static Map<String, Object> bookPayload(String title, String author, String genre, Integer year) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("title", title);
        payload.put("author", author);
        payload.put("genre", genre);
        payload.put("year", year);
        return payload;
    }

    protected static Response createBook(String token, String title) {
        return createBook(token, bookPayload(title, "Test Author", "Fantasy", 2024));
    }

    protected static Response createBook(String token, Map<String, Object> payload) {
        Response response = RestAssured.given()
                .contentType(ContentType.JSON)
                .header("Authorization", "Bearer " + token)
                .body(payload)
                .post("/api/books")
                .andReturn();

        trackCreatedBook(response);
        return response;
    }

    protected static Response updateBook(String token, Long bookId, Map<String, Object> payload) {
        return RestAssured.given()
                .contentType(ContentType.JSON)
                .header("Authorization", "Bearer " + token)
                .body(payload)
                .put("/api/books/{id}", bookId)
                .andReturn();
    }

    protected static Response deleteBook(String token, Long bookId) {
        Response response = RestAssured.given()
                .header("Authorization", "Bearer " + token)
                .delete("/api/books/{id}", bookId)
                .andReturn();

        if (response.statusCode() == 204 || response.statusCode() == 404) {
            createdBookIds.remove(bookId);
        }
        return response;
    }

    protected static Long createOwnedBookId(String token, String title) {
        return createBook(token, title)
                .then()
                .statusCode(201)
                .extract()
                .jsonPath()
                .getLong("id");
    }

    protected static void registerUser(String email, String password) {
        RestAssured.given()
                .contentType(ContentType.JSON)
                .body(authPayload(email, password))
                .post("/api/auth/register")
                .then()
                .statusCode(org.hamcrest.Matchers.anyOf(org.hamcrest.Matchers.is(201), org.hamcrest.Matchers.is(409)));
    }

    protected static String loginUser(String email, String password) {
        Response response = RestAssured.given()
                .contentType(ContentType.JSON)
                .body(authPayload(email, password))
                .post("/api/auth/login")
                .then()
                .statusCode(200)
                .extract()
                .response();

        return response.jsonPath().getString("token");
    }

    private static void trackCreatedBook(Response response) {
        if (response == null || response.statusCode() != 201) {
            return;
        }

        long createdBookId = response.jsonPath().getLong("id");
        if (createdBookId > 0) {
            createdBookIds.add(createdBookId);
        }
    }

    private static Set<Long> snapshotCreatedBookIds() {
        return new LinkedHashSet<>(createdBookIds);
    }

    private static void cleanupTestData() {
        if (!isBackendAvailable()) {
            return;
        }

        String adminToken = loginUser(ADMIN_EMAIL, ADMIN_PASSWORD);
        for (Long bookId : snapshotCreatedBookIds()) {
            Response response = deleteBook(adminToken, bookId);
            int status = response.statusCode();
            if (status != 204 && status != 404) {
                throw new IllegalStateException("Failed to clean up test book " + bookId + ": HTTP " + status);
            }
        }

        RestAssured.given()
                .header("Authorization", "Bearer " + adminToken)
                .delete("/api/activity")
                .then()
                .statusCode(204);
    }

    private static boolean isBackendAvailable() {
        try {
            HttpURLConnection connection = (HttpURLConnection) URI.create(BASE_URL + "/api/books").toURL().openConnection();
            connection.setConnectTimeout(1000);
            connection.setReadTimeout(1000);
            connection.setRequestMethod("GET");
            int status = connection.getResponseCode();
            return status >= 200 && status < 500;
        } catch (IOException exception) {
            return false;
        }
    }

    private static void startBackendProcess() {
        Path testsDir = Path.of(System.getProperty("user.dir"));
        Path backendDir = testsDir.resolve("..").resolve("backend").normalize();
        Path backendPom = backendDir.resolve("pom.xml");
        Path wrapper = backendDir.resolve(isWindows() ? "mvnw.cmd" : "mvnw");
        try {
            Files.createDirectories(BACKEND_LOG_PATH.getParent());
            ProcessBuilder builder = new ProcessBuilder(buildCommand(wrapper, backendPom));
            builder.directory(backendDir.toFile());
            builder.redirectErrorStream(true);
            builder.redirectOutput(BACKEND_LOG_PATH.toFile());
            backendProcess = builder.start();
            backendStartedBySuite = true;
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to start backend process for API tests", exception);
        }
    }

    private static String[] buildCommand(Path wrapper, Path backendPom) {
        if (isWindows()) {
            return new String[] {
                    "cmd",
                    "/c",
                    wrapper.toString(),
                    "-f",
                    backendPom.toString(),
                    "spring-boot:run"
            };
        }

        return new String[] {
                "sh",
                "-c",
                wrapper + " -f " + backendPom + " spring-boot:run"
        };
    }

    private static void waitForBackend() {
        long deadline = System.nanoTime() + STARTUP_TIMEOUT.toNanos();
        while (System.nanoTime() < deadline) {
            if (backendProcess != null && !backendProcess.isAlive()) {
                throw new IllegalStateException("Backend process exited before tests could connect");
            }
            if (isBackendAvailable()) {
                return;
            }

            LockSupport.parkNanos(Duration.ofMillis(500).toNanos());
            if (Thread.currentThread().isInterrupted()) {
                throw new IllegalStateException("Interrupted while waiting for backend startup");
            }
        }

        throw new IllegalStateException("Timed out waiting for backend startup");
    }

    private static boolean isWindows() {
        return System.getProperty("os.name", "").toLowerCase().contains("win");
    }
}