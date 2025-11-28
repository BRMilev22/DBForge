package com.dbforge.dbforge.service;

import com.dbforge.dbforge.dto.*;
import com.dbforge.dbforge.model.User;
import com.dbforge.dbforge.repository.UserRepository;
import com.dbforge.dbforge.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final TelegramService telegramService;
    
    /**
     * Step 1: Initiate registration - validate data and create pending user
     */
    @Transactional
    public RegisterInitiateResponse initiateRegistration(RegisterInitiateRequest request) {
        // Validate phone number format (Bulgarian only)
        if (!telegramService.isValidBulgarianPhone(request.getPhoneNumber())) {
            throw new RuntimeException("Invalid phone number. Please use Bulgarian format: +359XXXXXXXXX");
        }
        
        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }
        
        // Check if username already exists
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already exists");
        }
        
        // Check if phone number already exists (and is verified)
        Optional<User> existingPhone = userRepository.findByPhoneNumber(request.getPhoneNumber());
        if (existingPhone.isPresent()) {
            User existing = existingPhone.get();
            if (existing.getPhoneVerified() != null && existing.getPhoneVerified()) {
                throw new RuntimeException("This phone number is already registered");
            }
            // If not verified, we can update the pending registration
            if (existing.getStatus() == User.UserStatus.PENDING_VERIFICATION) {
                // Update existing pending user
                existing.setUsername(request.getUsername());
                existing.setEmail(request.getEmail());
                existing.setPasswordHash(passwordEncoder.encode(request.getPassword()));
                existing.setFirstName(request.getFirstName());
                existing.setLastName(request.getLastName());
                userRepository.save(existing);
                
                return buildInitiateResponse(existing);
            }
        }
        
        // Create new pending user
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setRole(User.UserRole.STUDENT);
        user.setStatus(User.UserStatus.PENDING_VERIFICATION);
        user.setPhoneVerified(false);
        user.setEmailVerified(false);
        
        user = userRepository.save(user);
        log.info("Registration initiated for phone: {}", request.getPhoneNumber());
        
        return buildInitiateResponse(user);
    }
    
    private RegisterInitiateResponse buildInitiateResponse(User user) {
        boolean telegramLinked = user.getTelegramChatId() != null;
        
        return RegisterInitiateResponse.builder()
                .success(true)
                .message(telegramLinked 
                    ? "Telegram linked. Click 'Send Code' to receive your verification code."
                    : "Please link your Telegram account first, then click 'Send Code'.")
                .telegramDeepLink(telegramService.getDeepLink(user.getPhoneNumber()))
                .botUsername(telegramService.getBotUsername())
                .telegramLinked(telegramLinked)
                .registrationToken(user.getId().toString()) // Simple token for now
                .build();
    }
    
    /**
     * Step 2: Send verification code via Telegram
     */
    @Transactional
    public boolean sendVerificationCode(String phoneNumber) {
        if (!telegramService.isValidBulgarianPhone(phoneNumber)) {
            throw new RuntimeException("Invalid phone number format");
        }
        
        User user = userRepository.findByPhoneNumber(phoneNumber)
                .orElseThrow(() -> new RuntimeException("Phone number not found. Please start registration first."));
        
        if (user.getTelegramChatId() == null) {
            throw new RuntimeException("Please link your Telegram account first by clicking the Telegram button.");
        }
        
        if (user.getPhoneVerified() != null && user.getPhoneVerified()) {
            throw new RuntimeException("This phone number is already verified.");
        }
        
        // Generate and save verification code
        String code = telegramService.generateVerificationCode();
        user.setVerificationCode(code);
        user.setVerificationExpiresAt(LocalDateTime.now().plusMinutes(10));
        userRepository.save(user);
        
        // Send code via Telegram
        boolean sent = telegramService.sendVerificationCode(
                user.getTelegramChatId(), 
                code, 
                user.getUsername()
        );
        
        if (!sent) {
            throw new RuntimeException("Failed to send verification code. Please try again.");
        }
        
        log.info("Verification code sent to phone: {}", phoneNumber);
        return true;
    }
    
    /**
     * Step 3: Verify code and complete registration
     */
    @Transactional
    public AuthResponse verifyAndCompleteRegistration(VerifyCodeRequest request) {
        if (!telegramService.isValidBulgarianPhone(request.getPhoneNumber())) {
            throw new RuntimeException("Invalid phone number format");
        }
        
        User user = userRepository.findByPhoneNumber(request.getPhoneNumber())
                .orElseThrow(() -> new RuntimeException("Phone number not found"));
        
        // Check if already verified
        if (user.getPhoneVerified() != null && user.getPhoneVerified() 
                && user.getStatus() == User.UserStatus.ACTIVE) {
            throw new RuntimeException("This phone number is already verified and registered.");
        }
        
        // Validate verification code
        if (user.getVerificationCode() == null) {
            throw new RuntimeException("No verification code sent. Please request a new code.");
        }
        
        if (user.getVerificationExpiresAt() == null || 
                LocalDateTime.now().isAfter(user.getVerificationExpiresAt())) {
            throw new RuntimeException("Verification code expired. Please request a new code.");
        }
        
        if (!user.getVerificationCode().equals(request.getVerificationCode())) {
            throw new RuntimeException("Invalid verification code");
        }
        
        // Complete registration
        user.setPhoneVerified(true);
        user.setEmailVerified(true); // Auto-verify email since phone is verified
        user.setStatus(User.UserStatus.ACTIVE);
        user.setVerificationCode(null);
        user.setVerificationExpiresAt(null);
        
        user = userRepository.save(user);
        log.info("User registration completed: {}", user.getEmail());
        
        return createAuthResponse(user);
    }
    
    /**
     * Check if a phone number is already linked to Telegram
     */
    public boolean isPhoneLinkedToTelegram(String phoneNumber) {
        Optional<User> user = userRepository.findByPhoneNumber(phoneNumber);
        return user.isPresent() && user.get().getTelegramChatId() != null;
    }
    
    /**
     * Legacy register method - now redirects to phone verification flow
     * Keep for backwards compatibility but will fail without phone
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        throw new RuntimeException("Phone verification required. Please use the new registration flow with phone number.");
    }
    
    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));
        
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Invalid email or password");
        }
        
        if (user.getStatus() != User.UserStatus.ACTIVE) {
            throw new RuntimeException("Account is not active");
        }
        
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);
        
        log.info("User logged in: {}", user.getEmail());
        
        return createAuthResponse(user);
    }
    
    public User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
    
    private AuthResponse createAuthResponse(User user) {
        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        
        return new AuthResponse(
                token,
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole().name()
        );
    }
}
