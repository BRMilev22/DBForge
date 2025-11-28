package com.dbforge.dbforge.controller;

import com.dbforge.dbforge.model.User;
import com.dbforge.dbforge.model.User.SubscriptionTier;
import com.dbforge.dbforge.repository.UserRepository;
import com.dbforge.dbforge.service.PaymentService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    
    private static final Logger logger = LoggerFactory.getLogger(PaymentController.class);
    
    private final PaymentService paymentService;
    private final UserRepository userRepository;
    
    public PaymentController(PaymentService paymentService, UserRepository userRepository) {
        this.paymentService = paymentService;
        this.userRepository = userRepository;
    }
    
    /**
     * Get Stripe publishable key for frontend
     */
    private Long getUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new RuntimeException("User not authenticated");
        }
        return (Long) authentication.getPrincipal();
    }
    
    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getConfig(Authentication authentication) {
        User user = userRepository.findById(getUserId(authentication))
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Map<String, Object> config = new HashMap<>();
        config.put("publishableKey", paymentService.getPublishableKey());
        config.put("currentTier", user.getSubscriptionTier().name());
        config.put("databaseLimit", user.getSubscriptionTier().getDatabaseLimit());
        config.put("hasSubscription", user.getStripeSubscriptionId() != null);
        
        // Pricing info
        Map<String, Object> pricing = new HashMap<>();
        
        Map<String, Object> freeTier = new HashMap<>();
        freeTier.put("name", "Free");
        freeTier.put("price", 0);
        freeTier.put("databases", SubscriptionTier.FREE.getDatabaseLimit());
        freeTier.put("features", new String[]{"2 databases", "All database types", "Basic support"});
        pricing.put("FREE", freeTier);
        
        Map<String, Object> proTier = new HashMap<>();
        proTier.put("name", "Pro");
        proTier.put("price", 9);
        proTier.put("databases", SubscriptionTier.PRO.getDatabaseLimit());
        proTier.put("features", new String[]{"10 databases", "All database types", "Priority support", "API access"});
        pricing.put("PRO", proTier);
        
        Map<String, Object> businessTier = new HashMap<>();
        businessTier.put("name", "Business");
        businessTier.put("price", 29);
        businessTier.put("databases", SubscriptionTier.BUSINESS.getDatabaseLimit());
        businessTier.put("features", new String[]{"50 databases", "All database types", "24/7 support", "API access", "Team management"});
        pricing.put("BUSINESS", businessTier);
        
        config.put("pricing", pricing);
        
        return ResponseEntity.ok(config);
    }
    
    /**
     * Get current subscription info
     */
    @GetMapping("/subscription")
    public ResponseEntity<Map<String, Object>> getSubscription(Authentication authentication) {
        User user = userRepository.findById(getUserId(authentication))
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return ResponseEntity.ok(paymentService.getSubscriptionInfo(user));
    }
    
    /**
     * Create checkout session for upgrading
     */
    @PostMapping("/checkout")
    public ResponseEntity<?> createCheckout(
            @RequestBody CheckoutRequest request,
            Authentication authentication) {
        
        User user = userRepository.findById(getUserId(authentication))
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        try {
            SubscriptionTier tier = SubscriptionTier.valueOf(request.tier.toUpperCase());
            
            if (tier == SubscriptionTier.FREE) {
                return ResponseEntity.badRequest().body(Map.of("error", "Cannot checkout for free tier"));
            }
            
            if (tier == user.getSubscriptionTier()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Already subscribed to this tier"));
            }
            
            String baseUrl = request.baseUrl != null ? request.baseUrl : "http://localhost:3000";
            String successUrl = baseUrl + "/payment/success";
            String cancelUrl = baseUrl + "/payment/cancel";
            
            Map<String, String> session = paymentService.createCheckoutSession(user, tier, successUrl, cancelUrl);
            
            return ResponseEntity.ok(session);
            
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid tier: " + request.tier));
        } catch (StripeException e) {
            logger.error("Stripe error creating checkout", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Payment service error: " + e.getMessage()));
        }
    }
    
    /**
     * Handle successful payment (called after redirect)
     */
    @GetMapping("/success")
    public ResponseEntity<Map<String, Object>> paymentSuccess(
            @RequestParam("session_id") String sessionId,
            Authentication authentication) {
        
        logger.info("Processing payment success for session: {}", sessionId);
        
        try {
            User user = userRepository.findById(getUserId(authentication))
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            logger.info("User {} current tier: {}", user.getUsername(), user.getSubscriptionTier());
            
            // Verify and process the checkout session - returns the new tier
            String newTier = paymentService.processCheckoutSession(sessionId, user);
            
            logger.info("User {} new tier after processing: {}", user.getUsername(), newTier);
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("tier", newTier);
            result.put("databaseLimit", User.SubscriptionTier.valueOf(newTier).getDatabaseLimit());
            result.put("message", "Your subscription has been activated!");
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error processing checkout session: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to activate subscription: " + e.getMessage()));
        }
    }
    
    /**
     * Cancel subscription
     */
    @PostMapping("/cancel")
    public ResponseEntity<?> cancelSubscription(Authentication authentication) {
        User user = userRepository.findById(getUserId(authentication))
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (user.getStripeSubscriptionId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "No active subscription"));
        }
        
        try {
            paymentService.cancelSubscription(user);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Subscription canceled. You have been downgraded to the free tier."
            ));
        } catch (StripeException e) {
            logger.error("Stripe error canceling subscription", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to cancel subscription: " + e.getMessage()));
        }
    }
    
    /**
     * Stripe webhook endpoint
     */
    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String sigHeader) {
        
        try {
            paymentService.handleWebhook(payload, sigHeader);
            return ResponseEntity.ok("Webhook processed");
        } catch (SignatureVerificationException e) {
            logger.error("Webhook signature verification failed", e);
            return ResponseEntity.badRequest().body("Invalid signature");
        } catch (Exception e) {
            logger.error("Webhook processing error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Webhook error");
        }
    }
    
    // Request DTOs
    public static class CheckoutRequest {
        public String tier;
        public String baseUrl;
    }
}
