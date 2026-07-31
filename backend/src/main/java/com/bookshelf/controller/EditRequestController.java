package com.bookshelf.controller;

import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bookshelf.entity.Book;
import com.bookshelf.entity.EditRequest;
import com.bookshelf.entity.EditRequestStatus;
import com.bookshelf.repository.BookRepository;
import com.bookshelf.repository.EditRequestRepository;
import com.bookshelf.service.AccessService;
import com.bookshelf.service.ActivityService;

@RestController
@RequestMapping("/api/books/{id}/edit-requests")
public class EditRequestController {

    private final BookRepository bookRepository;
    private final EditRequestRepository editRequestRepository;
    private final ActivityService activityService;
    private final AccessService accessService;

    public EditRequestController(BookRepository bookRepository, EditRequestRepository editRequestRepository,
            ActivityService activityService, AccessService accessService) {
        this.bookRepository = bookRepository;
        this.editRequestRepository = editRequestRepository;
        this.activityService = activityService;
        this.accessService = accessService;
    }

    @PostMapping
    public ResponseEntity<?> createRequest(@PathVariable Long id, Principal principal) {
        Optional<Book> bookOptional = bookRepository.findById(id);
        if (bookOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Book book = bookOptional.get();
        String requesterEmail = principal.getName();
        if (isOwner(book, requesterEmail)) {
            return ResponseEntity.badRequest().body(Map.of("message", "owners cannot request access to their own books"));
        }
        if (editRequestRepository.existsByBookIdAndRequesterEmailAndStatus(id, requesterEmail, EditRequestStatus.PENDING)) {
            return ResponseEntity.badRequest().body(Map.of("message", "a pending request already exists"));
        }

        String requesterUsername = accessService.displayNameForEmail(requesterEmail);
        String ownerUsername = (book.getOwnerUsername() != null && !book.getOwnerUsername().isBlank())
            ? book.getOwnerUsername()
            : accessService.displayNameForEmail(book.getOwnerEmail());

        EditRequest saved = editRequestRepository.save(
            new EditRequest(null, id, requesterEmail, requesterUsername, EditRequestStatus.PENDING, Instant.now()));
        activityService.logEditRequested(requesterUsername, book.getTitle(), ownerUsername);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping
    public ResponseEntity<?> getPendingRequests(@PathVariable Long id, Principal principal) {
        Optional<Book> bookOptional = bookRepository.findById(id);
        if (bookOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Book book = bookOptional.get();
        if (!isOwner(book, principal.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "forbidden"));
        }

        List<EditRequest> requests = editRequestRepository.findByBookIdAndStatusOrderByCreatedAtAsc(id, EditRequestStatus.PENDING);
        requests.forEach(request -> {
            if (request.getRequesterUsername() == null || request.getRequesterUsername().isBlank()) {
                request.setRequesterUsername(accessService.displayNameForEmail(request.getRequesterEmail()));
            }
        });
        return ResponseEntity.ok(requests);
    }

    @PutMapping("/{requestId}/approve")
    public ResponseEntity<?> approveRequest(@PathVariable Long id, @PathVariable Long requestId, Principal principal) {
        return updateRequestStatus(id, requestId, principal.getName(), EditRequestStatus.APPROVED);
    }

    @PutMapping("/{requestId}/deny")
    public ResponseEntity<?> denyRequest(@PathVariable Long id, @PathVariable Long requestId, Principal principal) {
        return updateRequestStatus(id, requestId, principal.getName(), EditRequestStatus.DENIED);
    }

    private ResponseEntity<?> updateRequestStatus(Long bookId, Long requestId, String actorEmail, EditRequestStatus status) {
        Optional<Book> bookOptional = bookRepository.findById(bookId);
        if (bookOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Book book = bookOptional.get();
        if (!isOwner(book, actorEmail)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "forbidden"));
        }

        Optional<EditRequest> requestOptional = editRequestRepository.findByIdAndBookId(requestId, bookId);
        if (requestOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        EditRequest request = requestOptional.get();
        request.setStatus(status);
        if (request.getRequesterUsername() == null || request.getRequesterUsername().isBlank()) {
            request.setRequesterUsername(accessService.displayNameForEmail(request.getRequesterEmail()));
        }
        EditRequest saved = editRequestRepository.save(request);
        String ownerUsername = accessService.displayNameForEmail(actorEmail);
        String requesterUsername = request.getRequesterUsername();
        if (status == EditRequestStatus.APPROVED) {
            activityService.logEditApproved(ownerUsername, requesterUsername, book.getTitle());
        } else {
            activityService.logEditDenied(ownerUsername, requesterUsername, book.getTitle());
        }
        return ResponseEntity.ok(saved);
    }

    private boolean isOwner(Book book, String email) {
        if (accessService.isAdmin(email)) {
            return true;
        }

        return book.getOwnerEmail() != null && book.getOwnerEmail().equalsIgnoreCase(email);
    }
}
