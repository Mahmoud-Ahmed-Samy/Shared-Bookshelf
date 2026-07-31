package com.bookshelf.service;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

@Service
public class LoginAttemptService {

    private static final Duration LOCKOUT_DURATION = Duration.ofMinutes(5);

    private final ConcurrentHashMap<String, AttemptState> attemptsByEmail = new ConcurrentHashMap<>();

    public boolean isLocked(String email) {
        AttemptState state = attemptsByEmail.get(email);
        if (state == null) {
            return false;
        }
        if (state.lockedUntil() == null) {
            return false;
        }
        if (state.lockedUntil().isAfter(Instant.now())) {
            return true;
        }
        attemptsByEmail.remove(email);
        return false;
    }

    public void recordFailure(String email, int maxFailures) {
        attemptsByEmail.compute(email, (key, current) -> {
            int failureCount = current == null ? 1 : current.failureCount() + 1;
            Instant lockedUntil = failureCount >= maxFailures ? Instant.now().plus(LOCKOUT_DURATION) : null;
            return new AttemptState(failureCount, lockedUntil);
        });
    }

    public void reset(String email) {
        attemptsByEmail.remove(email);
    }

    private record AttemptState(int failureCount, Instant lockedUntil) {
    }
}
