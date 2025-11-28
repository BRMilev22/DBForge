package com.dbforge.dbforge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterInitiateResponse {
    private boolean success;
    private String message;
    private String telegramDeepLink; // Link to open Telegram bot
    private String botUsername;      // Bot username for display
    private boolean telegramLinked;  // Whether phone is already linked to Telegram
    private String registrationToken; // Token to identify this registration session
}
