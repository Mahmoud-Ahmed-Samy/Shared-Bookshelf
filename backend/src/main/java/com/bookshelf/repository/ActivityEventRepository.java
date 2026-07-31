package com.bookshelf.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.bookshelf.entity.ActivityEvent;

public interface ActivityEventRepository extends JpaRepository<ActivityEvent, Long> {

    List<ActivityEvent> findTop50ByOrderByCreatedAtDesc();
}
