package com.bookshelf.tests;

import java.util.UUID;

import org.testng.annotations.Test;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;

public class EditRequestTests extends BaseTest {

    @Test(groups = {"edit-requests"})
    public void nonOwnerCannotPutOrDeleteWithoutApproval() {
	String ownerToken = registerAndLogin(createUniqueEmail("owner-forbidden"), getDefaultPassword());
	String requesterToken = registerAndLogin(createUniqueEmail("requester-forbidden"), getDefaultPassword());
	Long bookId = createOwnedBookId(ownerToken, "Forbidden Edit " + UUID.randomUUID());

	updateBook(requesterToken, bookId, bookPayload("Forbidden Edit Revised", "Author", "Drama", 2025))
		.then()
		.statusCode(403);

	deleteBook(requesterToken, bookId)
		.then()
		.statusCode(403);
    }

    @Test(groups = {"edit-requests"})
    public void nonOwnerCanRequestEditAccess() {
	String ownerToken = registerAndLogin(createUniqueEmail("owner-request"), getDefaultPassword());
	String requesterEmail = createUniqueEmail("requester-request");
	String requesterToken = registerAndLogin(requesterEmail, getDefaultPassword());
	Long bookId = createOwnedBookId(ownerToken, "Request Access " + UUID.randomUUID());

	RestAssured.given()
		.header("Authorization", "Bearer " + requesterToken)
		.post("/api/books/{id}/edit-requests", bookId)
		.then()
		.statusCode(201);
    }

    @Test(groups = {"edit-requests"})
    public void ownerCanApproveRequest() {
	Scenario scenario = createApprovalScenario("approve-owner");

	RestAssured.given()
		.header("Authorization", "Bearer " + scenario.ownerToken)
		.put("/api/books/{bookId}/edit-requests/{requestId}/approve", scenario.bookId, scenario.requestId)
		.then()
		.statusCode(200);
    }

    @Test(groups = {"edit-requests"})
    public void requesterCanPutAfterApproval() {
	Scenario scenario = createApprovalScenario("approve-put");
	approveScenarioRequest(scenario);
		String updatedTitle = "Approved Edit Revised " + UUID.randomUUID();

		updateBook(scenario.requesterToken, scenario.bookId, bookPayload(updatedTitle, "Author", "Sci-Fi", 2025))
		.then()
		.statusCode(200);
    }

    @Test(groups = {"edit-requests"})
    public void requesterStillCannotDeleteAfterApproval() {
	Scenario scenario = createApprovalScenario("approve-delete");
	approveScenarioRequest(scenario);

	deleteBook(scenario.requesterToken, scenario.bookId)
		.then()
		.statusCode(403);
    }

    @Test(groups = {"edit-requests"})
    public void deniedRequesterStillGets403OnPut() {
	Scenario scenario = createApprovalScenario("deny-put");
		String updatedTitle = "Denied Edit Revised " + UUID.randomUUID();

	RestAssured.given()
		.header("Authorization", "Bearer " + scenario.ownerToken)
		.put("/api/books/{bookId}/edit-requests/{requestId}/deny", scenario.bookId, scenario.requestId)
		.then()
		.statusCode(200);

		updateBook(scenario.requesterToken, scenario.bookId, bookPayload(updatedTitle, "Author", "Sci-Fi", 2025))
		.then()
		.statusCode(403);
    }

    private Scenario createApprovalScenario(String prefix) {
	String ownerToken = registerAndLogin(createUniqueEmail(prefix + "-owner"), getDefaultPassword());
	String requesterToken = registerAndLogin(createUniqueEmail(prefix + "-requester"), getDefaultPassword());
	Long bookId = createOwnedBookId(ownerToken, "Workflow " + prefix + " " + UUID.randomUUID());

	Response response = RestAssured.given()
		.header("Authorization", "Bearer " + requesterToken)
		.post("/api/books/{id}/edit-requests", bookId)
		.then()
		.statusCode(201)
		.extract()
		.response();

	return new Scenario(ownerToken, requesterToken, bookId, response.jsonPath().getLong("id"));
    }

    private void approveScenarioRequest(Scenario scenario) {
	RestAssured.given()
		.header("Authorization", "Bearer " + scenario.ownerToken)
		.put("/api/books/{bookId}/edit-requests/{requestId}/approve", scenario.bookId, scenario.requestId)
		.then()
		.statusCode(200);
    }

    private record Scenario(String ownerToken, String requesterToken, Long bookId, Long requestId) {
    }
}