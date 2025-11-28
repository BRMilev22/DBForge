package com.dbforge.dbforge.repository;

import com.dbforge.dbforge.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    Optional<User> findByPhoneNumber(String phoneNumber);
    Optional<User> findByTelegramChatId(Long telegramChatId);
    Optional<User> findByStripeCustomerId(String stripeCustomerId);
    Optional<User> findByStripeSubscriptionId(String stripeSubscriptionId);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByPhoneNumber(String phoneNumber);
}
