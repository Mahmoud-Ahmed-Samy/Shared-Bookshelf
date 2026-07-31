package com.bookshelf.service;

import java.time.Instant;

import org.springframework.stereotype.Service;

import com.bookshelf.entity.ActivityEvent;
import com.bookshelf.entity.ActivityType;
import com.bookshelf.repository.ActivityEventRepository;

@Service
public class ActivityService {

    private final ActivityEventRepository activityEventRepository;

    public ActivityService(ActivityEventRepository activityEventRepository) {
        this.activityEventRepository = activityEventRepository;
    }

    public void logBookAdded(String actorName, String title) {
        log(ActivityType.BOOK_ADDED, actorName + " added '" + title + "'");
    }

    public void logBookEdited(String actorName, String title) {
        log(ActivityType.BOOK_EDITED, actorName + " edited '" + title + "'");
    }

    public void logBookDeleted(String actorName, String title) {
        log(ActivityType.BOOK_DELETED, actorName + " deleted '" + title + "'");
    }

    public void logEditRequested(String requesterName, String title, String ownerName) {
        log(ActivityType.EDIT_REQUESTED,
                requesterName + " requested edit access to '" + title + "' from " + ownerName);
    }

    public void logEditApproved(String ownerName, String requesterName, String title) {
        log(ActivityType.EDIT_APPROVED,
                ownerName + " approved edit access for " + requesterName + " on '" + title + "'");
    }

    public void logEditDenied(String ownerName, String requesterName, String title) {
        log(ActivityType.EDIT_DENIED,
                ownerName + " denied edit access for " + requesterName + " on '" + title + "'");
    }

    private void log(ActivityType type, String message) {
        activityEventRepository.save(new ActivityEvent(null, type, message, Instant.now()));
    }
}
