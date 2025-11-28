import crypto from "crypto";

export function encryptAES256(data, secret) {
  const json = JSON.stringify(data);

  const key = crypto.createHash("sha256").update(secret, "utf8").digest();
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(json, "utf8", "base64");
  encrypted += cipher.final("base64");

  return {
    iv: iv.toString("base64"),
    payload: encrypted
  };
}
