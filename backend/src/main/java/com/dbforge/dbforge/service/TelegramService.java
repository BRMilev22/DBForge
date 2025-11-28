package com.dbforge.dbforge.service;

import com.dbforge.dbforge.model.User;
import com.dbforge.dbforge.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramService {

    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${telegram.bot.token:}")
    private String botToken;

    @Value("${telegram.bot.username:DBForgeBot}")
    private String botUsername;

    private static final String TELEGRAM_API_BASE = "https://api.telegram.org/bot";

    /**
     * Generate a 6-digit verification code
     */
    public String generateVerificationCode() {
        int code = 100000 + secureRandom.nextInt(900000);
        return String.valueOf(code);
    }

    /**
     * Send verification code to user via Telegram
     */
    public boolean sendVerificationCode(Long chatId, String code, String username) {
        if (botToken == null || botToken.isEmpty()) {
            log.error("Telegram bot token not configured");
            return false;
        }

        String message = String.format(
            "🔐 *DBForge Verification*\n\n" +
            "Hello %s!\n\n" +
            "Your verification code is: `%s`\n\n" +
            "This code will expire in 10 minutes.\n\n" +
            "_If you didn't request this code, please ignore this message._",
            escapeMarkdown(username),
            code
        );

        return sendMessage(chatId, message, true);
    }

    /**
     * Send a welcome message when user starts the bot
     */
    public boolean sendWelcomeMessage(Long chatId, String phoneNumber) {
        String message = String.format(
            "👋 *Welcome to DBForge!*\n\n" +
            "Your phone number `%s` has been linked to this Telegram account.\n\n" +
            "You can now return to the DBForge website and click *\"Send Code\"* to receive your verification code here.\n\n" +
            "📱 Need help? Visit https://dbforge.dev",
            phoneNumber
        );

        return sendMessage(chatId, message, true);
    }

    /**
     * Send a generic message to a chat
     */
    public boolean sendMessage(Long chatId, String text, boolean useMarkdown) {
        if (botToken == null || botToken.isEmpty()) {
            log.error("Telegram bot token not configured");
            return false;
        }

        try {
            String url = TELEGRAM_API_BASE + botToken + "/sendMessage";
            
            String jsonBody = objectMapper.writeValueAsString(new java.util.HashMap<String, Object>() {{
                put("chat_id", chatId);
                put("text", text);
                if (useMarkdown) {
                    put("parse_mode", "Markdown");
                }
            }});

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode responseJson = objectMapper.readTree(response.body());
                if (responseJson.has("ok") && responseJson.get("ok").asBoolean()) {
                    log.info("Telegram message sent successfully to chat {}", chatId);
                    return true;
                }
            }
            
            log.error("Failed to send Telegram message. Status: {}, Response: {}", 
                    response.statusCode(), response.body());
            return false;

        } catch (Exception e) {
            log.error("Error sending Telegram message", e);
            return false;
        }
    }

    /**
     * Process incoming Telegram update (webhook)
     */
    public void processUpdate(JsonNode update) {
        try {
            if (!update.has("message")) {
                return;
            }

            JsonNode message = update.get("message");
            Long chatId = message.get("chat").get("id").asLong();
            String text = message.has("text") ? message.get("text").asText() : "";

            // Check if user sent /start command with phone number
            if (text.startsWith("/start")) {
                handleStartCommand(chatId, text, message);
            } else if (text.startsWith("/verify")) {
                handleVerifyCommand(chatId, text);
            } else if (text.matches("\\+359\\d{9}")) {
                // User sent a Bulgarian phone number directly
                handlePhoneNumber(chatId, text, message);
            }

        } catch (Exception e) {
            log.error("Error processing Telegram update", e);
        }
    }

    /**
     * Handle /start command - user starts the bot with phone number
     * Format: /start phone_359XXXXXXXXX
     */
    private void handleStartCommand(Long chatId, String text, JsonNode message) {
        String[] parts = text.split(" ");
        
        if (parts.length < 2 || !parts[1].startsWith("phone_")) {
            // User started bot without phone number - show instructions
            sendMessage(chatId, 
                "👋 *Welcome to DBForge Verification Bot!*\n\n" +
                "To link your phone number, please:\n" +
                "1. Go to https://dbforge.dev\n" +
                "2. Click \"Create Account\"\n" +
                "3. Enter your phone number\n" +
                "4. Click the Telegram button to link your account\n\n" +
                "Or send your Bulgarian phone number here in format: `+359XXXXXXXXX`",
                true
            );
            return;
        }

        // Extract phone number from start parameter
        String phoneParam = parts[1].substring(6); // Remove "phone_" prefix
        String phoneNumber = "+" + phoneParam.replace("_", ""); // Convert phone_359XXXXXXXXX to +359XXXXXXXXX
        
        linkPhoneToTelegram(chatId, phoneNumber, message);
    }

    /**
     * Handle direct phone number input
     */
    private void handlePhoneNumber(Long chatId, String phoneNumber, JsonNode message) {
        linkPhoneToTelegram(chatId, phoneNumber, message);
    }

    /**
     * Link a phone number to a Telegram chat ID
     */
    private void linkPhoneToTelegram(Long chatId, String phoneNumber, JsonNode message) {
        // Validate Bulgarian phone format
        if (!phoneNumber.matches("\\+359\\d{9}")) {
            sendMessage(chatId, 
                "❌ Invalid phone number format.\n\n" +
                "Please use Bulgarian format: `+359XXXXXXXXX`\n" +
                "Example: `+359888123456`",
                true
            );
            return;
        }

        // Check if this phone is already linked to another Telegram account
        Optional<User> existingUser = userRepository.findByPhoneNumber(phoneNumber);
        if (existingUser.isPresent()) {
            User user = existingUser.get();
            if (user.getTelegramChatId() != null && !user.getTelegramChatId().equals(chatId)) {
                sendMessage(chatId, 
                    "❌ This phone number is already linked to another Telegram account.",
                    false
                );
                return;
            }
            
            // Update existing user's chat ID
            user.setTelegramChatId(chatId);
            userRepository.save(user);
            sendWelcomeMessage(chatId, phoneNumber);
            return;
        }

        // Check if this Telegram account is already linked to another phone
        Optional<User> telegramUser = userRepository.findByTelegramChatId(chatId);
        if (telegramUser.isPresent()) {
            User user = telegramUser.get();
            if (user.getPhoneNumber() != null && !user.getPhoneNumber().equals(phoneNumber)) {
                sendMessage(chatId, 
                    "⚠️ This Telegram account is already linked to phone: `" + user.getPhoneNumber() + "`\n\n" +
                    "Each Telegram account can only be linked to one phone number.",
                    true
                );
                return;
            }
        }

        // Phone not yet registered - store the chat ID for later when user registers
        // We'll create a pending entry or just inform the user
        sendMessage(chatId, 
            "✅ *Phone number linked!*\n\n" +
            "Your Telegram is now linked to: `" + phoneNumber + "`\n\n" +
            "Please return to DBForge website and complete your registration. " +
            "You'll receive your verification code here!",
            true
        );
        
        log.info("Telegram chat {} linked to phone {}", chatId, phoneNumber);
    }

    /**
     * Handle /verify command
     */
    private void handleVerifyCommand(Long chatId, String text) {
        sendMessage(chatId, 
            "To receive a verification code:\n\n" +
            "1. Go to https://dbforge.dev\n" +
            "2. Start the registration process\n" +
            "3. Enter your phone number\n" +
            "4. Click \"Send Code\"\n\n" +
            "The code will be sent here automatically!",
            false
        );
    }

    /**
     * Get the bot's deep link for a phone number
     */
    public String getDeepLink(String phoneNumber) {
        // Convert +359888123456 to 359888123456 for the start parameter
        String phoneParam = phoneNumber.replace("+", "").replace(" ", "");
        return String.format("https://t.me/%s?start=phone_%s", botUsername, phoneParam);
    }

    /**
     * Escape special characters for Telegram Markdown
     */
    private String escapeMarkdown(String text) {
        if (text == null) return "";
        return text.replace("_", "\\_")
                   .replace("*", "\\*")
                   .replace("[", "\\[")
                   .replace("`", "\\`");
    }

    /**
     * Validate Bulgarian phone number format
     */
    public boolean isValidBulgarianPhone(String phoneNumber) {
        return phoneNumber != null && phoneNumber.matches("\\+359\\d{9}");
    }

    /**
     * Check if the bot is properly configured
     */
    public boolean isConfigured() {
        return botToken != null && !botToken.isEmpty();
    }

    /**
     * Get bot username for frontend display
     */
    public String getBotUsername() {
        return botUsername;
    }
}
