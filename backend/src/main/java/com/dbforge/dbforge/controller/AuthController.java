package com.dbforge.dbforge.controller;

import com.dbforge.dbforge.dto.*;
import com.dbforge.dbforge.service.AuthService;
import com.dbforge.dbforge.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class AuthController {
    
    private final AuthService authService;
    private final JwtUtil jwtUtil;
    
    /**
     * Step 1: Initiate registration with phone number
     */
    @PostMapping("/register/initiate")
    public ResponseEntity<?> initiateRegistration(@RequestBody RegisterInitiateRequest request) {
        try {
            RegisterInitiateResponse response = authService.initiateRegistration(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Registration initiation failed", e);
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Step 2: Send verification code via Telegram
     */
    @PostMapping("/register/send-code")
    public ResponseEntity<?> sendVerificationCode(@RequestBody SendCodeRequest request) {
        try {
            authService.sendVerificationCode(request.getPhoneNumber());
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Verification code sent to your Telegram"
            ));
        } catch (Exception e) {
            log.error("Failed to send verification code", e);
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Step 3: Verify code and complete registration
     */
    @PostMapping("/register/verify")
    public ResponseEntity<?> verifyAndCompleteRegistration(@RequestBody VerifyCodeRequest request) {
        try {
            AuthResponse response = authService.verifyAndCompleteRegistration(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Verification failed", e);
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Check if phone is linked to Telegram (for frontend polling)
     */
    @GetMapping("/register/check-telegram")
    public ResponseEntity<?> checkTelegramLinked(@RequestParam String phoneNumber) {
        try {
            boolean linked = authService.isPhoneLinkedToTelegram(phoneNumber);
            return ResponseEntity.ok(Map.of("telegramLinked", linked));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Legacy register endpoint - now requires phone verification
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            AuthResponse response = authService.register(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Registration failed", e);
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        }
    }
    
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            AuthResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Login failed", e);
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        }
    }
    
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        try {
            if (authentication == null || authentication.getPrincipal() == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
            }
            
            Long userId = (Long) authentication.getPrincipal();
            var user = authService.getUserById(userId);
            
            return ResponseEntity.ok(Map.of(
                    "id", user.getId(),
                    "username", user.getUsername(),
                    "email", user.getEmail(),
                    "role", user.getRole().name()
            ));
        } catch (Exception e) {
            log.error("Failed to get current user", e);
            return ResponseEntity.status(401).body(Map.of("error", "Invalid token"));
        }
    }
}
