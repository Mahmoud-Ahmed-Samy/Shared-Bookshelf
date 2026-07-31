package com.bookshelf.controller;

import java.security.Principal;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.bookshelf.entity.Book;
import com.bookshelf.entity.EditRequestStatus;
import com.bookshelf.repository.BookRepository;
import com.bookshelf.repository.EditRequestRepository;
import com.bookshelf.service.AccessService;
import com.bookshelf.service.ActivityService;

@RestController
@RequestMapping("/api/books")
public class BookController {

    private final BookRepository bookRepository;
    private final EditRequestRepository editRequestRepository;
    private final ActivityService activityService;
    private final AccessService accessService;

    public BookController(BookRepository bookRepository, EditRequestRepository editRequestRepository,
            ActivityService activityService, AccessService accessService) {
        this.bookRepository = bookRepository;
        this.editRequestRepository = editRequestRepository;
        this.activityService = activityService;
        this.accessService = accessService;
    }

    @GetMapping
    public List<Book> getAllBooks(
            Principal principal,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Integer yearFrom,
            @RequestParam(required = false) Integer yearTo,
            @RequestParam(required = false) Integer exactYear,
            @RequestParam(required = false) Boolean trusted,
            @RequestParam(required = false, defaultValue = "title") String sortField,
            @RequestParam(required = false, defaultValue = "asc") String sortDirection) {
        return applyFiltersAndSort(bookRepository.findAll(), query, yearFrom, yearTo, exactYear, trusted, sortField, sortDirection)
                .stream()
                .map(book -> decorateBook(book, principal))
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Book> getBookById(@PathVariable Long id, Principal principal) {
        Optional<Book> book = bookRepository.findById(id);
        return book.map(existing -> ResponseEntity.ok(decorateBook(existing, principal)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createBook(@RequestBody Book book, Principal principal) {
        Map<String, String> errors = validateBook(book, null);
        if (!errors.isEmpty()) {
            return ResponseEntity.badRequest().body(errors);
        }
        book.setOwnerEmail(principal.getName());
        book.setOwnerUsername(accessService.displayNameForEmail(principal.getName()));
        book.setFoundOnline(Boolean.TRUE.equals(book.getFoundOnline()));
        book.setWasEdited(false);
        book.setLastEditedBy(null);
        book.setLastEditedAt(null);
        Book saved = bookRepository.save(book);
        activityService.logBookAdded(accessService.displayNameForEmail(principal.getName()), saved.getTitle());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateBook(@PathVariable Long id, @RequestBody Book updatedBook, Principal principal) {
        Optional<Book> existing = bookRepository.findById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Book book = existing.get();
        if (!canEditBook(book, principal.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "forbidden"));
        }
        Map<String, String> errors = validateBook(updatedBook, id);
        if (!errors.isEmpty()) {
            return ResponseEntity.badRequest().body(errors);
        }
        book.setTitle(updatedBook.getTitle());
        book.setAuthor(updatedBook.getAuthor());
        book.setGenre(updatedBook.getGenre());
        book.setYear(updatedBook.getYear());
        book.setCoverUrl(updatedBook.getCoverUrl());
        book.setFoundOnline(Boolean.TRUE.equals(updatedBook.getFoundOnline()));
        book.setWasEdited(true);
        book.setLastEditedBy(accessService.displayNameForEmail(principal.getName()));
        book.setLastEditedAt(Instant.now());
        Book saved = bookRepository.save(book);
        activityService.logBookEdited(accessService.displayNameForEmail(principal.getName()), saved.getTitle());
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBook(@PathVariable Long id, Principal principal) {
        Optional<Book> existing = bookRepository.findById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (!isOwner(existing.get(), principal.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "forbidden"));
        }
        activityService.logBookDeleted(accessService.displayNameForEmail(principal.getName()), existing.get().getTitle());
        bookRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/all")
    public ResponseEntity<?> deleteAllBooks(Principal principal) {
        if (principal == null || !accessService.isAdmin(principal.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "forbidden"));
        }

        editRequestRepository.deleteAllInBatch();
        bookRepository.deleteAllInBatch();
        return ResponseEntity.noContent().build();
    }

    private boolean canEditBook(Book book, String email) {
        if (accessService.isAdmin(email)) {
            return true;
        }

        return isOwner(book, email)
                || editRequestRepository.existsByBookIdAndRequesterEmailAndStatus(book.getId(), email, EditRequestStatus.APPROVED);
    }

    private boolean isOwner(Book book, String email) {
        if (accessService.isAdmin(email)) {
            return true;
        }

        return book.getOwnerEmail() != null && book.getOwnerEmail().equalsIgnoreCase(email);
    }

    private Book decorateBook(Book book, Principal principal) {
        book.setPendingEditRequestCount(editRequestRepository.countByBookIdAndStatus(book.getId(), EditRequestStatus.PENDING));
        if (book.getOwnerUsername() == null || book.getOwnerUsername().isBlank()) {
            book.setOwnerUsername(accessService.displayNameForEmail(book.getOwnerEmail()));
        }
        if (book.getLastEditedBy() != null && !book.getLastEditedBy().isBlank()) {
            book.setLastEditedBy(accessService.displayNameForIdentity(book.getLastEditedBy()));
        }

        if (principal == null) {
            book.setCurrentUserEditRequestStatus(null);
            return book;
        }

        Optional<com.bookshelf.entity.EditRequest> latestRequest = editRequestRepository.findTopByBookIdAndRequesterEmailOrderByCreatedAtDesc(
                book.getId(), principal.getName());
        if (latestRequest.isPresent()) {
            book.setCurrentUserEditRequestStatus(latestRequest.get().getStatus());
        } else {
            book.setCurrentUserEditRequestStatus(null);
        }
        return book;
    }

    private Map<String, String> validateBook(Book book, Long currentId) {
        Map<String, String> errors = new HashMap<>();
        if (book.getTitle() == null || book.getTitle().isBlank()) {
            errors.put("title", "is required");
        }
        if (book.getAuthor() == null || book.getAuthor().isBlank()) {
            errors.put("author", "is required");
        }
        if (book.getYear() == null || book.getYear() < 1450 || book.getYear() > 2026) {
            errors.put("year", "must be between 1450 and 2026");
        }

        if (!errors.containsKey("title") && !errors.containsKey("author") && book.getYear() >= 1450 && book.getYear() <= 2026) {
            String normalizedTitle = normalizeText(book.getTitle());
            String normalizedAuthor = normalizeText(book.getAuthor());
            boolean duplicateExists = currentId == null
                    ? bookRepository.existsByTitleIgnoreCaseAndAuthorIgnoreCaseAndYear(normalizedTitle, normalizedAuthor, book.getYear())
                    : bookRepository.existsByTitleIgnoreCaseAndAuthorIgnoreCaseAndYearAndIdNot(normalizedTitle, normalizedAuthor, book.getYear(), currentId);
            if (duplicateExists) {
                errors.put("title", "already exists");
            }
        }
        return errors;
    }

    private String normalizeText(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private List<Book> applyFiltersAndSort(List<Book> books, String query, Integer yearFrom, Integer yearTo,
            Integer exactYear, Boolean trusted, String sortField, String sortDirection) {
        Stream<Book> stream = books.stream();

        if (query != null && !query.isBlank()) {
            String normalizedQuery = query.trim().toLowerCase();
            stream = stream.filter(book -> matchesQuery(book, normalizedQuery));
        }

        if (Boolean.TRUE.equals(trusted)) {
            stream = stream.filter(book -> Boolean.TRUE.equals(book.getFoundOnline()));
        }

        if (exactYear != null) {
            stream = stream.filter(book -> book.getYear() != null && book.getYear().intValue() == exactYear.intValue());
        } else {
            if (yearFrom != null) {
                stream = stream.filter(book -> book.getYear() != null && book.getYear() >= yearFrom);
            }
            if (yearTo != null) {
                stream = stream.filter(book -> book.getYear() != null && book.getYear() <= yearTo);
            }
        }

        Comparator<Book> comparator = comparatorFor(sortField);
        if ("desc".equalsIgnoreCase(sortDirection)) {
            comparator = comparator.reversed();
        }

        return stream.sorted(comparator).toList();
    }

    private Comparator<Book> comparatorFor(String sortField) {
        if ("author".equalsIgnoreCase(sortField)) {
            return Comparator.comparing(book -> normalizeComparable(book.getAuthor()));
        }
        if ("genre".equalsIgnoreCase(sortField)) {
            return Comparator.comparing(book -> normalizeComparable(book.getGenre()));
        }
        if ("year".equalsIgnoreCase(sortField)) {
            return (left, right) -> {
                Integer leftYear;
                Integer rightYear;
                if (left.getYear() == null) {
                    leftYear = 0;
                } else {
                    leftYear = left.getYear();
                }
                if (right.getYear() == null) {
                    rightYear = 0;
                } else {
                    rightYear = right.getYear();
                }
                return leftYear.compareTo(rightYear);
            };
        }
        if ("added".equalsIgnoreCase(sortField)) {
            return (left, right) -> {
                Long leftId;
                Long rightId;
                if (left.getId() == null) {
                    leftId = 0L;
                } else {
                    leftId = left.getId();
                }
                if (right.getId() == null) {
                    rightId = 0L;
                } else {
                    rightId = right.getId();
                }
                return leftId.compareTo(rightId);
            };
        }

        return Comparator.comparing(book -> normalizeComparable(book.getTitle()));
    }

    private boolean matchesQuery(Book book, String normalizedQuery) {
        return String.valueOf(book.getId() == null ? "" : book.getId()).toLowerCase().contains(normalizedQuery)
                || normalizeComparable(book.getTitle()).contains(normalizedQuery)
                || normalizeComparable(book.getAuthor()).contains(normalizedQuery)
                || normalizeComparable(book.getGenre()).contains(normalizedQuery)
                || normalizeComparable(book.getOwnerUsername()).contains(normalizedQuery);
    }

    private String normalizeComparable(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
