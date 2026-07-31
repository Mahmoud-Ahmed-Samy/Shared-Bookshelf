package com.bookshelf.tests;

import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.notNullValue;
import org.testng.annotations.Test;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;

public class BookTests extends BaseTest {

	@Test(groups = {"books"})
	public void getAllBooksReturns200() {
		RestAssured.given()
				.get("/api/books")
				.then()
				.statusCode(200)
				.body("size()", greaterThanOrEqualTo(0));
	}

	@Test(groups = {"books"})
	public void getMissingBookReturns404() {
		RestAssured.given()
				.get("/api/books/{id}", Long.MAX_VALUE)
				.then()
				.statusCode(404);
	}

	@Test(groups = {"books"})
	public void postBookWithoutTokenReturns401() {
		RestAssured.given()
				.contentType(ContentType.JSON)
				.body(bookPayload("No Token Book", "Anonymous", "Mystery", 2020))
				.post("/api/books")
				.then()
				.statusCode(401);
	}

	@Test(groups = {"books"})
	public void postValidBookWithTokenReturns201AndId() {
		String token = getAuthToken();
		String title = "Valid Book " + UUID.randomUUID();
		String author = "Author";
		String genre = "Fantasy";
		int year = 2024;

		createBook(token, bookPayload(title, author, genre, year))
				.then()
				.statusCode(201)
				.body("id", notNullValue())
				.body("title", equalTo(title))
				.body("author", equalTo(author))
				.body("genre", equalTo(genre))
				.body("year", equalTo(year));
	}

	@Test(groups = {"books"})
	public void postBookWithMissingTitleReturns400() {
		RestAssured.given()
				.contentType(ContentType.JSON)
				.header("Authorization", "Bearer " + getAuthToken())
				.body(bookPayload(null, "Author", "Fantasy", 2024))
				.post("/api/books")
				.then()
				.statusCode(400);
	}

	@Test(groups = {"books"})
	public void postBookWithMissingAuthorReturns400() {
		RestAssured.given()
				.contentType(ContentType.JSON)
				.header("Authorization", "Bearer " + getAuthToken())
				.body(bookPayload("Missing Author " + UUID.randomUUID(), null, "Fantasy", 2024))
				.post("/api/books")
				.then()
				.statusCode(400);
	}

	@Test(groups = {"books"})
	public void postBookWithInvalidYearReturns400() {
		RestAssured.given()
				.contentType(ContentType.JSON)
				.header("Authorization", "Bearer " + getAuthToken())
				.body(bookPayload("Invalid Year " + UUID.randomUUID(), "Author", "Fantasy", 1300))
				.post("/api/books")
				.then()
				.statusCode(400);
	}

	@Test(groups = {"books"})
	public void postDuplicateBookReturns400() {
		String token = getAuthToken();
		String title = "Duplicate Book " + UUID.randomUUID();
		Map<String, Object> payload = bookPayload(title, "Duplicate Author", "Drama", 2024);

		createBook(token, payload)
				.then()
				.statusCode(201);

		RestAssured.given()
				.contentType(ContentType.JSON)
				.header("Authorization", "Bearer " + token)
				.body(payload)
				.post("/api/books")
				.then()
				.statusCode(400);
	}

	@Test(groups = {"books"})
	public void getBookByIdReturns200AndBody() {
		String token = getAuthToken();
		String title = "Get By ID " + UUID.randomUUID();
		Long id = createOwnedBookId(token, title);

		RestAssured.given()
				.get("/api/books/{id}", id)
				.then()
				.statusCode(200)
				.body("id", equalTo(id.intValue()))
				.body("title", equalTo(title));
	}

	@Test(groups = {"books"})
	public void putBookAsOwnerReturns200() {
		String token = getAuthToken();
		Long bookId = createOwnedBookId(token, "Owner Update " + UUID.randomUUID());
		String updatedTitle = "Owner Update Revised " + UUID.randomUUID();

		updateBook(token, bookId, bookPayload(updatedTitle, "Author", "Drama", 2025))
				.then()
				.statusCode(200)
				.body("title", equalTo(updatedTitle));
	}

	@Test(groups = {"books"})
	public void putMissingBookReturns404() {
		updateBook(getAuthToken(), Long.MAX_VALUE, bookPayload("No Book", "Author", "Drama", 2025))
				.then()
				.statusCode(404);
	}

	@Test(groups = {"books"})
	public void putBookWithMissingTitleReturns400() {
		String token = getAuthToken();
		Long bookId = createOwnedBookId(token, "Update Missing Title " + UUID.randomUUID());

		updateBook(token, bookId, bookPayload(null, "Author", "Drama", 2025))
				.then()
				.statusCode(400);
	}

	@Test(groups = {"books"})
	public void deleteBookAsOwnerReturns204() {
		String token = getAuthToken();
		Long bookId = createOwnedBookId(token, "Owner Delete " + UUID.randomUUID());

		deleteBook(token, bookId)
				.then()
				.statusCode(204);

		RestAssured.given()
				.get("/api/books/{id}", bookId)
				.then()
				.statusCode(404);
	}

	@Test(groups = {"books"})
	public void deleteMissingBookReturns404() {
		deleteBook(getAuthToken(), Long.MAX_VALUE)
				.then()
				.statusCode(404);
	}

	@Test(groups = {"books"})
	public void searchByQueryAndFilterByExactYearWorks() {
		String token = getAuthToken();
		String marker = "search-marker-" + UUID.randomUUID();
		String lowYearTitle = marker + "-2020";
		String highYearTitle = marker + "-2024";

		createBook(token, bookPayload(lowYearTitle, "Filter Author", "Drama", 2020))
				.then()
				.statusCode(201);

		createBook(token, bookPayload(highYearTitle, "Filter Author", "Drama", 2024))
				.then()
				.statusCode(201);

		RestAssured.given()
				.queryParam("query", marker)
				.queryParam("exactYear", 2024)
				.queryParam("sortField", "year")
				.queryParam("sortDirection", "asc")
				.get("/api/books")
				.then()
				.statusCode(200)
				.body("size()", equalTo(1))
				.body("[0].title", equalTo(highYearTitle))
				.body("[0].year", equalTo(2024));
	}
}