package com.dbforge.dbforge.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SendCodeRequest {
    private String phoneNumber; // Bulgarian format: +359XXXXXXXXX
}
