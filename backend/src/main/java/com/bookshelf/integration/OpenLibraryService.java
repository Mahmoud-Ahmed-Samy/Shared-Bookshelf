package com.bookshelf.integration;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpClient.Redirect;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class OpenLibraryService {

    private static final String SEARCH_FIELDS = "cover_i,title,author_name,subject,first_publish_year";
    private static final Duration OPEN_LIBRARY_CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration OPEN_LIBRARY_REQUEST_TIMEOUT = Duration.ofSeconds(5);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String appBaseUrl;

    public OpenLibraryService(@Value("${app.base-url:http://localhost:8080}") String appBaseUrl) {
        this.httpClient = HttpClient.newBuilder()
                .followRedirects(Redirect.NORMAL)
            .connectTimeout(OPEN_LIBRARY_CONNECT_TIMEOUT)
                .build();
        this.objectMapper = new ObjectMapper();
        this.appBaseUrl = appBaseUrl;
    }

    public OpenLibraryMatch findBookDetails(String title, String author) {
        String trimmedTitle = title == null ? "" : title.trim();
        if (trimmedTitle.length() < 3) {
            return null;
        }

        String trimmedAuthor = author == null ? "" : author.trim();
        List<String> attempts = new ArrayList<>();

        if (trimmedAuthor.length() >= 2) {
            attempts.add("https://openlibrary.org/search.json?title=" + encode(trimmedTitle)
                    + "&author=" + encode(trimmedAuthor)
                    + "&limit=5&fields=" + encode(SEARCH_FIELDS));
        }

        attempts.add("https://openlibrary.org/search.json?title=" + encode(trimmedTitle)
                + "&limit=5&fields=" + encode(SEARCH_FIELDS));

        String query = trimmedAuthor.isBlank() ? trimmedTitle : trimmedTitle + " " + trimmedAuthor;
        attempts.add("https://openlibrary.org/search.json?q=" + encode(query)
                + "&limit=5&fields=" + encode(SEARCH_FIELDS));

        for (String attempt : attempts) {
            JsonNode docs = fetchDocs(attempt);
            if (docs == null || !docs.isArray()) {
                continue;
            }

            for (JsonNode doc : docs) {
                int coverId = doc.path("cover_i").asInt(0);
                if (coverId <= 0) {
                    continue;
                }

                String candidateTitle = doc.path("title").asText("");
                if (!titleLooksLikeMatch(trimmedTitle, candidateTitle)) {
                    continue;
                }

                if (!authorLooksLikeMatch(trimmedAuthor, doc.path("author_name"))) {
                    continue;
                }

                String candidateAuthor = doc.path("author_name").isArray() && doc.path("author_name").size() > 0
                        ? doc.path("author_name").get(0).asText(trimmedAuthor)
                        : trimmedAuthor;
                String genre = pickGenre(doc.path("subject"));
                Integer year = doc.hasNonNull("first_publish_year") ? doc.get("first_publish_year").asInt() : null;

                return new OpenLibraryMatch(
                        candidateTitle.isBlank() ? trimmedTitle : candidateTitle,
                        candidateAuthor,
                        genre,
                        year,
                        appBaseUrl + "/api/open-library/covers/" + coverId);
            }
        }

        return null;
    }

    public CoverImage fetchCover(long coverId) {
        if (coverId <= 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://covers.openlibrary.org/b/id/" + coverId + "-M.jpg"))
            .timeout(OPEN_LIBRARY_REQUEST_TIMEOUT)
                .GET()
                .build();

        try {
            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() >= 400 || response.body() == null || response.body().length == 0) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            }

            String contentType = response.headers().firstValue("Content-Type").orElse("image/jpeg");
            return new CoverImage(response.body(), contentType);
        } catch (IOException | InterruptedException ex) {
            if (ex instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "cover lookup failed", ex);
        }
    }

    private JsonNode fetchDocs(String url) {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .timeout(OPEN_LIBRARY_REQUEST_TIMEOUT)
            .GET()
            .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                return null;
            }
            return objectMapper.readTree(response.body()).path("docs");
        } catch (IOException | InterruptedException ex) {
            if (ex instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return null;
        }
    }

    private String pickGenre(JsonNode subjects) {
        if (subjects == null || !subjects.isArray()) {
            return "";
        }

        List<String> candidates = new ArrayList<>();
        for (JsonNode subject : subjects) {
            String value = subject.asText("").trim();
            if (value.length() > 1) {
                candidates.add(value);
            }
        }

        for (String candidate : candidates) {
            String normalized = normalize(candidate);
            if (!normalized.equals("fiction")
                    && !normalized.equals("juvenile fiction")
                    && !normalized.equals("children")
                    && !normalized.equals("history")
                    && !normalized.equals("literature")
                    && !normalized.equals("novel")) {
                return candidate;
            }
        }

        return candidates.isEmpty() ? "" : candidates.get(0);
    }

    private boolean titleLooksLikeMatch(String queryTitle, String candidateTitle) {
        String query = normalize(queryTitle);
        String candidate = normalize(candidateTitle);
        if (query.isBlank() || candidate.isBlank()) {
            return false;
        }
        if (candidate.equals(query) || candidate.startsWith(query) || query.startsWith(candidate)) {
            return true;
        }

        String[] words = query.split(" ");
        int significantWords = 0;
        int matchedWords = 0;
        for (String word : words) {
            if (word.length() <= 2) {
                continue;
            }
            significantWords++;
            if (candidate.contains(word)) {
                matchedWords++;
            }
        }

        if (significantWords == 0) {
            return candidate.contains(query);
        }

        return (double) matchedWords / significantWords >= 0.6;
    }

    private boolean authorLooksLikeMatch(String queryAuthor, JsonNode candidateAuthors) {
        String query = normalize(queryAuthor);
        if (query.isBlank()) {
            return true;
        }
        if (candidateAuthors == null || !candidateAuthors.isArray()) {
            return false;
        }

        for (JsonNode author : candidateAuthors) {
            String candidate = normalize(author.asText(""));
            if (!candidate.isBlank() && (candidate.contains(query) || query.contains(candidate))) {
                return true;
            }
        }
        return false;
    }

    private String normalize(String value) {
        return value == null ? "" : java.text.Normalizer.normalize(value.toLowerCase(), java.text.Normalizer.Form.NFKD)
                .replaceAll("\\p{M}+", "")
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    public record OpenLibraryMatch(String title, String author, String genre, Integer year, String coverUrl) {
    }

    public record CoverImage(byte[] bytes, String contentType) {
    }
}
