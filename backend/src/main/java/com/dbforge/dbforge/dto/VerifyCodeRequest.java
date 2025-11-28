package com.dbforge.dbforge.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VerifyCodeRequest {
    private String phoneNumber;      // Bulgarian format: +359XXXXXXXXX
    private String verificationCode; // 6-digit code
}
