package com.bookshelf.tests;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.blankOrNullString;
import static org.hamcrest.Matchers.equalTo;

import org.testng.annotations.Test;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;

public class AuthTests extends BaseTest {

	@Test(groups = {"auth"})
	public void registerBrandNewUserReturns201() {
		RestAssured.given()
				.contentType(ContentType.JSON)
				.body(authPayload(createUniqueEmail("auth-register"), getDefaultPassword()))
				.post("/api/auth/register")
				.then()
				.statusCode(201);
	}

	@Test(groups = {"auth"})
	public void registerDuplicateUserReturns409() {
		String email = createUniqueEmail("auth-duplicate");
		registerUser(email, getDefaultPassword());

		RestAssured.given()
				.contentType(ContentType.JSON)
				.body(authPayload(email, getDefaultPassword()))
				.post("/api/auth/register")
				.then()
				.statusCode(409);
	}

	@Test(groups = {"auth"}, dataProvider = "missingAuthFields")
	public void registerWithMissingFieldsReturns400(String email, String password, int expectedStatus) {
		RestAssured.given()
				.contentType(ContentType.JSON)
				.body(authPayload(email, password))
				.post("/api/auth/register")
				.then()
				.statusCode(expectedStatus);
	}

	@Test(groups = {"auth"})
	public void loginWithCorrectCredentialsReturnsToken() {
		String email = createUniqueEmail("auth-login");
		registerUser(email, getDefaultPassword());

		RestAssured.given()
				.contentType(ContentType.JSON)
				.body(authPayload(email, getDefaultPassword()))
				.post("/api/auth/login")
				.then()
				.statusCode(200)
				.body("token", not(blankOrNullString()));
	}

	@Test(groups = {"auth"})
	public void loginWithWrongPasswordReturns401() {
		String email = createUniqueEmail("auth-wrong-password");
		registerUser(email, getDefaultPassword());

		RestAssured.given()
				.contentType(ContentType.JSON)
				.body(authPayload(email, "WrongPass123!"))
				.post("/api/auth/login")
				.then()
				.statusCode(401);
	}

	@Test(groups = {"auth"})
	public void loginWithMissingPasswordReturns400() {
		String email = createUniqueEmail("auth-missing-password");
		registerUser(email, getDefaultPassword());

		RestAssured.given()
				.contentType(ContentType.JSON)
				.body(authPayload(email, null))
				.post("/api/auth/login")
				.then()
				.statusCode(400)
				.body("message", equalTo("email and password are required"));
	}
}