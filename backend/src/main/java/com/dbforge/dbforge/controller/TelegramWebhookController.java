package com.dbforge.dbforge.controller;

import com.dbforge.dbforge.service.TelegramService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/webhook")
@RequiredArgsConstructor
@Slf4j
public class TelegramWebhookController {

    private final TelegramService telegramService;

    /**
     * Receive updates from Telegram bot webhook
     * Set webhook URL: https://dbforge.dev/api/webhook/telegram
     */
    @PostMapping("/telegram")
    public ResponseEntity<String> handleTelegramUpdate(@RequestBody JsonNode update) {
        log.debug("Received Telegram update: {}", update);
        
        try {
            telegramService.processUpdate(update);
            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            log.error("Error processing Telegram update", e);
            return ResponseEntity.ok("OK"); // Always return OK to Telegram
        }
    }

    /**
     * Health check for webhook
     */
    @GetMapping("/telegram/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Telegram webhook is active");
    }
}
