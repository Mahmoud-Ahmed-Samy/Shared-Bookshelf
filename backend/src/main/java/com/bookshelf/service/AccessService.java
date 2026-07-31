package com.bookshelf.service;

import java.util.Optional;

import org.springframework.stereotype.Service;

import com.bookshelf.entity.AppRole;
import com.bookshelf.entity.User;
import com.bookshelf.repository.UserRepository;

@Service
public class AccessService {

    private final UserRepository userRepository;

    public AccessService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public boolean isAdmin(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }

        return findUserByEmail(email)
                .map(User::getRole)
                .map(role -> role == AppRole.ADMIN)
                .orElse(false);
    }

    public String displayNameForEmail(String email) {
        if (email == null || email.isBlank()) {
            return "Unknown user";
        }

        return findUserByEmail(email)
                .map(User::getUsername)
                .filter(name -> name != null && !name.isBlank())
                .orElse("Unknown user");
    }

    public String displayNameForIdentity(String value) {
        if (value == null || value.isBlank()) {
            return "Unknown user";
        }

        if (value.contains("@")) {
            return displayNameForEmail(value);
        }

        return value;
    }

    private Optional<User> findUserByEmail(String email) {
        return userRepository.findByEmail(email.trim().toLowerCase());
    }
}
