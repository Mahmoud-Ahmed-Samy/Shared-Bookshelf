package com.bookshelf.entity;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Transient;

@Entity
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String title;
    private String author;
    private String genre;

    @Column(name = "book_year")
    private Integer year;

    @Lob
    @Column(name = "cover_url", columnDefinition = "CLOB")
    private String coverUrl;

    @Column(name = "found_online", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean foundOnline = false;

    @Column(name = "was_edited", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean wasEdited = false;

    @Column(name = "owner_email")
    @JsonIgnore
    private String ownerEmail;

    @Column(name = "owner_username")
    private String ownerUsername;

    @Column(name = "last_edited_by")
    private String lastEditedBy;

    @Column(name = "last_edited_at")
    private Instant lastEditedAt;

    @Transient
    private EditRequestStatus currentUserEditRequestStatus;

    @Transient
    private long pendingEditRequestCount;

    public Book() {
    }

    public Book(Long id, String title, String author, String genre, Integer year, String coverUrl, Boolean foundOnline,
            Boolean wasEdited, String ownerEmail, String ownerUsername, String lastEditedBy, Instant lastEditedAt) {
        this.id = id;
        this.title = title;
        this.author = author;
        this.genre = genre;
        this.year = year;
        this.coverUrl = coverUrl;
        this.foundOnline = foundOnline;
        this.wasEdited = wasEdited;
        this.ownerEmail = ownerEmail;
        this.ownerUsername = ownerUsername;
        this.lastEditedBy = lastEditedBy;
        this.lastEditedAt = lastEditedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }
    public String getGenre() { return genre; }
    public void setGenre(String genre) { this.genre = genre; }
    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }
    public String getCoverUrl() { return coverUrl; }
    public void setCoverUrl(String coverUrl) { this.coverUrl = coverUrl; }
    public Boolean getFoundOnline() { return foundOnline; }
    public void setFoundOnline(Boolean foundOnline) { this.foundOnline = foundOnline; }
    public Boolean getWasEdited() { return wasEdited; }
    public void setWasEdited(Boolean wasEdited) { this.wasEdited = wasEdited; }
    public String getOwnerEmail() { return ownerEmail; }
    public void setOwnerEmail(String ownerEmail) { this.ownerEmail = ownerEmail; }
    public String getOwnerUsername() { return ownerUsername; }
    public void setOwnerUsername(String ownerUsername) { this.ownerUsername = ownerUsername; }
    public String getLastEditedBy() { return lastEditedBy; }
    public void setLastEditedBy(String lastEditedBy) { this.lastEditedBy = lastEditedBy; }
    public Instant getLastEditedAt() { return lastEditedAt; }
    public void setLastEditedAt(Instant lastEditedAt) { this.lastEditedAt = lastEditedAt; }
    public EditRequestStatus getCurrentUserEditRequestStatus() { return currentUserEditRequestStatus; }
    public void setCurrentUserEditRequestStatus(EditRequestStatus currentUserEditRequestStatus) { this.currentUserEditRequestStatus = currentUserEditRequestStatus; }
    public long getPendingEditRequestCount() { return pendingEditRequestCount; }
    public void setPendingEditRequestCount(long pendingEditRequestCount) { this.pendingEditRequestCount = pendingEditRequestCount; }
}
