package com.bookshelf.controller;

import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bookshelf.entity.AppRole;
import com.bookshelf.entity.User;
import com.bookshelf.repository.UserRepository;
import com.bookshelf.security.JwtService;
import com.bookshelf.service.LoginAttemptService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final int MAX_FAILED_LOGINS = 5;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginAttemptService loginAttemptService;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService,
            LoginAttemptService loginAttemptService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.loginAttemptService = loginAttemptService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest request) {
        if (isBlank(request.email()) || isBlank(request.password()) || isBlank(request.username())) {
            return ResponseEntity.badRequest().body(Map.of("message", "email, username, and password are required"));
        }

        String email = request.email().trim().toLowerCase();
        String username = request.username().trim();
        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "email already registered"));
        }
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "username already taken"));
        }

        User savedUser = userRepository.save(new User(null, email, username, passwordEncoder.encode(request.password()), AppRole.USER));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new UserResponse(savedUser.getId(), savedUser.getEmail(), savedUser.getUsername()));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        if (isBlank(request.email()) || isBlank(request.password())) {
            return ResponseEntity.badRequest().body(Map.of("message", "email and password are required"));
        }

        String email = request.email().trim().toLowerCase();
        if (loginAttemptService.isLocked(email)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "account locked after too many failed logins; try again later"));
        }

        Optional<User> user = userRepository.findByEmail(email);
        if (user.isEmpty() || !passwordEncoder.matches(request.password(), user.get().getPassword())) {
            loginAttemptService.recordFailure(email, MAX_FAILED_LOGINS);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "invalid credentials"));
        }

        loginAttemptService.reset(email);
        String username = user.get().getUsername();
        if (isBlank(username)) {
            username = email.split("@")[0];
            user.get().setUsername(username);
            userRepository.save(user.get());
        }
        AppRole role = user.get().getRole() == null ? AppRole.USER : user.get().getRole();
        return ResponseEntity.ok(Map.of(
            "token", jwtService.generateToken(email, username, role),
            "username", username,
                "role", role.name()));
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public record AuthRequest(String email, String username, String password) {
    }

    public record UserResponse(Long id, String email, String username) {
    }
}
