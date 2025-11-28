package com.dbforge.dbforge.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false, length = 50)
    private String username;
    
    @Column(unique = true, nullable = false)
    private String email;
    
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    
    @Column(name = "first_name", length = 100)
    private String firstName;
    
    @Column(name = "last_name", length = 100)
    private String lastName;
    
    // Phone verification fields
    @Column(name = "phone_number", unique = true, length = 20)
    private String phoneNumber;
    
    @Column(name = "telegram_chat_id")
    private Long telegramChatId;
    
    @Column(name = "verification_code", length = 6)
    private String verificationCode;
    
    @Column(name = "verification_expires_at")
    private LocalDateTime verificationExpiresAt;
    
    @Column(name = "phone_verified")
    private Boolean phoneVerified = false;
    
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private UserRole role = UserRole.STUDENT;
    
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private UserStatus status = UserStatus.ACTIVE;
    
    @Column(name = "email_verified")
    private Boolean emailVerified = false;
    
    // Subscription fields
    @Enumerated(EnumType.STRING)
    @Column(name = "subscription_tier", length = 20)
    private SubscriptionTier subscriptionTier = SubscriptionTier.FREE;
    
    @Column(name = "stripe_customer_id")
    private String stripeCustomerId;
    
    @Column(name = "stripe_subscription_id")
    private String stripeSubscriptionId;
    
    @Column(name = "subscription_expires_at")
    private LocalDateTime subscriptionExpiresAt;
    
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    public enum UserRole {
        STUDENT, EDUCATOR, ADMIN
    }
    
    public enum UserStatus {
        ACTIVE, SUSPENDED, DELETED, PENDING_VERIFICATION
    }
    
    public enum SubscriptionTier {
        FREE(2),       // 2 databases
        PRO(10),       // 10 databases - $9/month
        BUSINESS(50);  // 50 databases - $29/month
        
        private final int databaseLimit;
        
        SubscriptionTier(int databaseLimit) {
            this.databaseLimit = databaseLimit;
        }
        
        public int getDatabaseLimit() {
            return databaseLimit;
        }
    }
}
