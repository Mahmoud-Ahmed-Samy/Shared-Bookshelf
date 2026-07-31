package com.bookshelf.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.bookshelf.entity.User;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByUsernameIgnoreCase(String username);
}
