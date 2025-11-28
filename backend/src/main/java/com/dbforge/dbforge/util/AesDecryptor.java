package com.dbforge.dbforge.util;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

public class AesDecryptor {

    public static String decrypt(String base64Payload, String apiToken) throws Exception {

        byte[] key = sha256(apiToken);
        byte[] data = Base64.getDecoder().decode(base64Payload);

        byte[] iv = new byte[16];
        byte[] encrypted = new byte[data.length - 16];

        System.arraycopy(data, 0, iv, 0, 16);
        System.arraycopy(data, 16, encrypted, 0, encrypted.length);

        Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
        cipher.init(
                Cipher.DECRYPT_MODE,
                new SecretKeySpec(key, "AES"),
                new IvParameterSpec(iv)
        );

        byte[] result = cipher.doFinal(encrypted);
        return new String(result);
    }

    private static byte[] sha256(String input) throws Exception {
        return java.security.MessageDigest
                .getInstance("SHA-256")
                .digest(input.getBytes("UTF-8"));
    }
}
