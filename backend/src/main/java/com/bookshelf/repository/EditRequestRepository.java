package com.bookshelf.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.bookshelf.entity.EditRequest;
import com.bookshelf.entity.EditRequestStatus;

public interface EditRequestRepository extends JpaRepository<EditRequest, Long> {

    boolean existsByBookIdAndRequesterEmailAndStatus(Long bookId, String requesterEmail, EditRequestStatus status);

    List<EditRequest> findByBookIdAndStatusOrderByCreatedAtAsc(Long bookId, EditRequestStatus status);

    java.util.Optional<EditRequest> findByIdAndBookId(Long id, Long bookId);

    java.util.Optional<EditRequest> findTopByBookIdAndRequesterEmailOrderByCreatedAtDesc(Long bookId, String requesterEmail);

    long countByBookIdAndStatus(Long bookId, EditRequestStatus status);
}
