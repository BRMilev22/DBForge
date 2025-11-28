package com.dbforge.dbforge.service;

import com.dbforge.dbforge.model.User;
import com.dbforge.dbforge.model.User.SubscriptionTier;
import com.dbforge.dbforge.repository.UserRepository;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.*;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;

@Service
public class PaymentService {
    
    private static final Logger logger = LoggerFactory.getLogger(PaymentService.class);
    
    @Value("${stripe.api.key}")
    private String stripeApiKey;
    
    @Value("${stripe.publishable.key}")
    private String stripePublishableKey;
    
    @Value("${stripe.webhook.secret:}")
    private String webhookSecret;
    
    @Value("${stripe.price.pro:}")
    private String proPriceId;
    
    @Value("${stripe.price.business:}")
    private String businessPriceId;
    
    private final UserRepository userRepository;
    
    // Hardcoded prices for testing (in cents)
    private static final long PRO_PRICE_CENTS = 900; // $9.00
    private static final long BUSINESS_PRICE_CENTS = 2900; // $29.00
    
    public PaymentService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    
    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeApiKey;
        logger.info("Stripe initialized with API key");
    }
    
    public String getPublishableKey() {
        return stripePublishableKey;
    }
    
    /**
     * Create or get Stripe customer for user
     */
    public String getOrCreateStripeCustomer(User user) throws StripeException {
        if (user.getStripeCustomerId() != null) {
            return user.getStripeCustomerId();
        }
        
        CustomerCreateParams params = CustomerCreateParams.builder()
                .setEmail(user.getEmail())
                .setName(user.getFirstName() + " " + user.getLastName())
                .putMetadata("user_id", user.getId().toString())
                .putMetadata("username", user.getUsername())
                .build();
        
        Customer customer = Customer.create(params);
        user.setStripeCustomerId(customer.getId());
        userRepository.save(user);
        
        logger.info("Created Stripe customer {} for user {}", customer.getId(), user.getUsername());
        return customer.getId();
    }
    
    /**
     * Create a checkout session for subscription
     */
    public Map<String, String> createCheckoutSession(User user, SubscriptionTier tier, String successUrl, String cancelUrl) throws StripeException {
        String customerId = getOrCreateStripeCustomer(user);
        
        // Determine price based on tier
        long priceInCents;
        String productName;
        
        switch (tier) {
            case PRO:
                priceInCents = PRO_PRICE_CENTS;
                productName = "DBForge Pro";
                break;
            case BUSINESS:
                priceInCents = BUSINESS_PRICE_CENTS;
                productName = "DBForge Business";
                break;
            default:
                throw new IllegalArgumentException("Cannot create checkout for FREE tier");
        }
        
        SessionCreateParams.Builder sessionBuilder = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                .setCustomer(customerId)
                .setSuccessUrl(successUrl + "?session_id={CHECKOUT_SESSION_ID}")
                .setCancelUrl(cancelUrl)
                .putMetadata("user_id", user.getId().toString())
                .putMetadata("tier", tier.name());
        
        // If we have price IDs configured, use them; otherwise create inline price
        if (tier == SubscriptionTier.PRO && proPriceId != null && !proPriceId.isEmpty()) {
            sessionBuilder.addLineItem(
                SessionCreateParams.LineItem.builder()
                    .setPrice(proPriceId)
                    .setQuantity(1L)
                    .build()
            );
        } else if (tier == SubscriptionTier.BUSINESS && businessPriceId != null && !businessPriceId.isEmpty()) {
            sessionBuilder.addLineItem(
                SessionCreateParams.LineItem.builder()
                    .setPrice(businessPriceId)
                    .setQuantity(1L)
                    .build()
            );
        } else {
            // Create inline price for testing
            sessionBuilder.addLineItem(
                SessionCreateParams.LineItem.builder()
                    .setPriceData(
                        SessionCreateParams.LineItem.PriceData.builder()
                            .setCurrency("usd")
                            .setUnitAmount(priceInCents)
                            .setRecurring(
                                SessionCreateParams.LineItem.PriceData.Recurring.builder()
                                    .setInterval(SessionCreateParams.LineItem.PriceData.Recurring.Interval.MONTH)
                                    .build()
                            )
                            .setProductData(
                                SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                    .setName(productName)
                                    .setDescription(tier.getDatabaseLimit() + " databases per month")
                                    .build()
                            )
                            .build()
                    )
                    .setQuantity(1L)
                    .build()
            );
        }
        
        Session session = Session.create(sessionBuilder.build());
        
        Map<String, String> result = new HashMap<>();
        result.put("sessionId", session.getId());
        result.put("url", session.getUrl());
        
        logger.info("Created checkout session {} for user {} upgrading to {}", session.getId(), user.getUsername(), tier);
        return result;
    }
    
    /**
     * Process checkout session after successful payment (called on redirect)
     * @return the new subscription tier name
     */
    public String processCheckoutSession(String sessionId, User user) throws StripeException {
        logger.info("Processing checkout session {} for user {}", sessionId, user.getUsername());
        
        Session session = Session.retrieve(sessionId);
        logger.info("Session status: {}, payment_status: {}", session.getStatus(), session.getPaymentStatus());
        logger.info("Session metadata: {}", session.getMetadata());
        
        if (!"complete".equals(session.getStatus())) {
            logger.warn("Checkout session not completed, status: {}", session.getStatus());
            throw new RuntimeException("Checkout session not completed, status: " + session.getStatus());
        }
        
        // Get the tier from metadata
        String tierStr = session.getMetadata().get("tier");
        logger.info("Tier from metadata: {}", tierStr);
        
        if (tierStr != null && !tierStr.isEmpty()) {
            SubscriptionTier tier = SubscriptionTier.valueOf(tierStr);
            logger.info("Updating user {} from {} to {}", user.getUsername(), user.getSubscriptionTier(), tier);
            user.setSubscriptionTier(tier);
            user.setStripeSubscriptionId(session.getSubscription());
            user.setSubscriptionExpiresAt(LocalDateTime.now().plusMonths(1));
            userRepository.save(user);
            userRepository.flush(); // Ensure changes are persisted immediately
            logger.info("User {} successfully upgraded to {} via checkout session {}", user.getUsername(), tier, sessionId);
            return tier.name();
        } else {
            logger.error("No tier found in session metadata for session {}", sessionId);
            throw new RuntimeException("No tier information found in checkout session");
        }
    }
    
    /**
     * Handle Stripe webhook events
     */
    public void handleWebhook(String payload, String sigHeader) throws SignatureVerificationException {
        Event event;
        
        if (webhookSecret != null && !webhookSecret.isEmpty()) {
            event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } else {
            // For testing without webhook secret
            event = Event.GSON.fromJson(payload, Event.class);
        }
        
        logger.info("Received Stripe webhook: {}", event.getType());
        
        switch (event.getType()) {
            case "checkout.session.completed":
                handleCheckoutCompleted(event);
                break;
            case "customer.subscription.updated":
                handleSubscriptionUpdated(event);
                break;
            case "customer.subscription.deleted":
                handleSubscriptionDeleted(event);
                break;
            case "invoice.payment_succeeded":
                handlePaymentSucceeded(event);
                break;
            case "invoice.payment_failed":
                handlePaymentFailed(event);
                break;
            default:
                logger.debug("Unhandled event type: {}", event.getType());
        }
    }
    
    private void handleCheckoutCompleted(Event event) {
        Session session = (Session) event.getDataObjectDeserializer().getObject().orElse(null);
        if (session == null) return;
        
        String userId = session.getMetadata().get("user_id");
        String tierStr = session.getMetadata().get("tier");
        
        if (userId != null && tierStr != null) {
            userRepository.findById(Long.parseLong(userId)).ifPresent(user -> {
                SubscriptionTier tier = SubscriptionTier.valueOf(tierStr);
                user.setSubscriptionTier(tier);
                user.setStripeSubscriptionId(session.getSubscription());
                // Set expiration to 1 month from now (will be updated by subscription events)
                user.setSubscriptionExpiresAt(LocalDateTime.now().plusMonths(1));
                userRepository.save(user);
                logger.info("User {} upgraded to {} tier", user.getUsername(), tier);
            });
        }
    }
    
    private void handleSubscriptionUpdated(Event event) {
        Subscription subscription = (Subscription) event.getDataObjectDeserializer().getObject().orElse(null);
        if (subscription == null) return;
        
        userRepository.findByStripeSubscriptionId(subscription.getId()).ifPresent(user -> {
            // Update subscription expiration
            if (subscription.getCurrentPeriodEnd() != null) {
                LocalDateTime expiresAt = LocalDateTime.ofInstant(
                    Instant.ofEpochSecond(subscription.getCurrentPeriodEnd()),
                    ZoneId.systemDefault()
                );
                user.setSubscriptionExpiresAt(expiresAt);
                
                // Check if subscription is active
                if ("active".equals(subscription.getStatus())) {
                    // Keep current tier
                } else if ("canceled".equals(subscription.getStatus()) || "unpaid".equals(subscription.getStatus())) {
                    // Will downgrade when subscription expires
                }
                
                userRepository.save(user);
                logger.info("Updated subscription for user {}, expires at {}", user.getUsername(), expiresAt);
            }
        });
    }
    
    private void handleSubscriptionDeleted(Event event) {
        Subscription subscription = (Subscription) event.getDataObjectDeserializer().getObject().orElse(null);
        if (subscription == null) return;
        
        userRepository.findByStripeSubscriptionId(subscription.getId()).ifPresent(user -> {
            user.setSubscriptionTier(SubscriptionTier.FREE);
            user.setStripeSubscriptionId(null);
            user.setSubscriptionExpiresAt(null);
            userRepository.save(user);
            logger.info("Subscription canceled for user {}, downgraded to FREE", user.getUsername());
        });
    }
    
    private void handlePaymentSucceeded(Event event) {
        Invoice invoice = (Invoice) event.getDataObjectDeserializer().getObject().orElse(null);
        if (invoice == null || invoice.getSubscription() == null) return;
        
        userRepository.findByStripeSubscriptionId(invoice.getSubscription()).ifPresent(user -> {
            logger.info("Payment succeeded for user {}", user.getUsername());
        });
    }
    
    private void handlePaymentFailed(Event event) {
        Invoice invoice = (Invoice) event.getDataObjectDeserializer().getObject().orElse(null);
        if (invoice == null || invoice.getSubscription() == null) return;
        
        userRepository.findByStripeSubscriptionId(invoice.getSubscription()).ifPresent(user -> {
            logger.warn("Payment failed for user {}", user.getUsername());
            // Could send notification to user here
        });
    }
    
    /**
     * Cancel a user's subscription
     */
    public void cancelSubscription(User user) throws StripeException {
        if (user.getStripeSubscriptionId() == null) {
            throw new IllegalStateException("User has no active subscription");
        }
        
        Subscription subscription = Subscription.retrieve(user.getStripeSubscriptionId());
        subscription.cancel();
        
        user.setSubscriptionTier(SubscriptionTier.FREE);
        user.setStripeSubscriptionId(null);
        user.setSubscriptionExpiresAt(null);
        userRepository.save(user);
        
        logger.info("Canceled subscription for user {}", user.getUsername());
    }
    
    /**
     * Get subscription info for a user
     */
    public Map<String, Object> getSubscriptionInfo(User user) {
        Map<String, Object> info = new HashMap<>();
        info.put("tier", user.getSubscriptionTier().name());
        info.put("databaseLimit", user.getSubscriptionTier().getDatabaseLimit());
        info.put("stripeCustomerId", user.getStripeCustomerId());
        info.put("subscriptionId", user.getStripeSubscriptionId());
        info.put("expiresAt", user.getSubscriptionExpiresAt());
        
        // Get current database count
        // This would need to be injected, but for now we'll leave it out
        
        return info;
    }
    
    /**
     * Check if user can create more databases
     */
    public boolean canCreateDatabase(User user, int currentDatabaseCount) {
        return currentDatabaseCount < user.getSubscriptionTier().getDatabaseLimit();
    }
}
