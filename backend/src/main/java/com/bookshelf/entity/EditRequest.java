package com.bookshelf.entity;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class EditRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long bookId;

    @Column(nullable = false)
    @JsonIgnore
    private String requesterEmail;

    @Column
    private String requesterUsername;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EditRequestStatus status;

    @Column(nullable = false)
    private Instant createdAt;

    public EditRequest() {
    }

    public EditRequest(Long id, Long bookId, String requesterEmail, String requesterUsername, EditRequestStatus status,
            Instant createdAt) {
        this.id = id;
        this.bookId = bookId;
        this.requesterEmail = requesterEmail;
        this.requesterUsername = requesterUsername;
        this.status = status;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getBookId() {
        return bookId;
    }

    public void setBookId(Long bookId) {
        this.bookId = bookId;
    }

    public String getRequesterEmail() {
        return requesterEmail;
    }

    public void setRequesterEmail(String requesterEmail) {
        this.requesterEmail = requesterEmail;
    }

    public String getRequesterUsername() {
        return requesterUsername;
    }

    public void setRequesterUsername(String requesterUsername) {
        this.requesterUsername = requesterUsername;
    }

    public EditRequestStatus getStatus() {
        return status;
    }

    public void setStatus(EditRequestStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
