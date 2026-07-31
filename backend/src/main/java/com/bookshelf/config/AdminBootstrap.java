package com.bookshelf.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.bookshelf.entity.AppRole;
import com.bookshelf.entity.User;
import com.bookshelf.repository.UserRepository;

@Component
public class AdminBootstrap implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminEmail;
    private final String adminUsername;
    private final String adminPassword;

    public AdminBootstrap(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${bookshelf.admin.email}") String adminEmail,
            @Value("${bookshelf.admin.username:admin}") String adminUsername,
            @Value("${bookshelf.admin.password}") String adminPassword) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminEmail = adminEmail;
        this.adminUsername = adminUsername;
        this.adminPassword = adminPassword;
    }

    @Override
    public void run(String... args) {
        String normalizedEmail = adminEmail == null ? "" : adminEmail.trim().toLowerCase();
        String normalizedAdminUsername = normalizeUsername(adminUsername);
        if (normalizedEmail.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            return;
        }

        backfillMissingUsernames();

        User adminUser = userRepository.findByEmail(normalizedEmail)
                .orElseGet(() -> new User(null, normalizedEmail, normalizedAdminUsername, passwordEncoder.encode(adminPassword), AppRole.ADMIN));

        adminUser.setEmail(normalizedEmail);
        adminUser.setUsername(reserveUniqueUsername(normalizedAdminUsername, adminUser.getId()));
        adminUser.setRole(AppRole.ADMIN);
        adminUser.setPassword(passwordEncoder.encode(adminPassword));

        userRepository.save(adminUser);
    }

    private void backfillMissingUsernames() {
        for (User user : userRepository.findAll()) {
            if (user.getUsername() != null && !user.getUsername().isBlank()) {
                continue;
            }

            String emailPrefix = user.getEmail() == null ? "user" : user.getEmail().split("@")[0];
            String suggested = normalizeUsername(emailPrefix);
            user.setUsername(reserveUniqueUsername(suggested, user.getId()));
            userRepository.save(user);
        }
    }

    private String reserveUniqueUsername(String base, Long currentUserId) {
        String candidate = normalizeUsername(base);
        int suffix = 1;

        while (isUsernameTakenByAnotherUser(candidate, currentUserId)) {
            candidate = normalizeUsername(base) + suffix;
            suffix++;
        }

        return candidate;
    }

    private boolean isUsernameTakenByAnotherUser(String username, Long currentUserId) {
        return userRepository.findAll().stream()
                .filter(user -> user.getUsername() != null)
                .anyMatch(user -> user.getUsername().equalsIgnoreCase(username)
                        && (currentUserId == null || !currentUserId.equals(user.getId())));
    }

    private String normalizeUsername(String value) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.isBlank()) {
            return "user";
        }
        return normalized;
    }
}
