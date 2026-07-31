package com.bookshelf.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bookshelf.entity.ActivityEvent;
import com.bookshelf.repository.ActivityEventRepository;
import com.bookshelf.service.AccessService;

@RestController
@RequestMapping("/api/activity")
public class ActivityController {

    private final ActivityEventRepository activityEventRepository;
    private final AccessService accessService;

    public ActivityController(ActivityEventRepository activityEventRepository, AccessService accessService) {
        this.activityEventRepository = activityEventRepository;
        this.accessService = accessService;
    }

    @GetMapping
    public List<ActivityEvent> getLatestActivity() {
        return activityEventRepository.findTop50ByOrderByCreatedAtDesc();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteActivityEvent(@PathVariable Long id, Principal principal) {
        if (principal == null || !accessService.isAdmin(principal.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(java.util.Map.of("message", "forbidden"));
        }
        if (!activityEventRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        activityEventRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<?> clearActivity(Principal principal) {
        if (principal == null || !accessService.isAdmin(principal.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(java.util.Map.of("message", "forbidden"));
        }

        activityEventRepository.deleteAllInBatch();
        return ResponseEntity.noContent().build();
    }
}
