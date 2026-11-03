package com.seiko.work.util;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * 敏感字段加解密工具（AES-256-GCM）
 *
 * <p>密钥在应用启动时通过 {@link #init(String)} 注入（通常来自环境变量），
 * 不落盘、不入库；同一明文每次加密产生不同随机 nonce，密文不可重放比对。</p>
 */
public final class CryptoUtil {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_BITS = 128;
    private static final int NONCE_BYTES = 12;
    private static final byte[] AAD = "seiko:work_mail:auth_code".getBytes(StandardCharsets.UTF_8);

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static volatile SecretKeySpec key;

    private CryptoUtil() {
    }

    /**
     * 初始化密钥：任意长度口令经 SHA-256 派生为 32 字节 AES-256 密钥
     *
     * @param passphrase 加密口令
     */
    public static synchronized void init(String passphrase) {
        if (passphrase == null || passphrase.isBlank()) {
            throw new IllegalStateException(
                    "敏感字段加密密钥未配置：请设置环境变量 CRYPTO_KEY（或配置项 seiko.security.crypto-key）");
        }
        if (passphrase.trim().length() < 32 || "seikowork".equals(passphrase.trim())) {
            throw new IllegalStateException("CRYPTO_KEY 必须至少为 32 个字符，请使用随机生成的密钥");
        }
        byte[] digest;
        try {
            digest = MessageDigest.getInstance("SHA-256").digest(passphrase.trim().getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("SHA-256 算法不可用", e);
        }
        key = new SecretKeySpec(digest, "AES");
    }

    /**
     * 加密敏感字段，返回 Base64(nonce + 密文 + GCM 认证标签)
     *
     * @param plaintext 明文
     * @return 密文，输入为空时原样返回
     */
    public static String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isEmpty()) {
            return plaintext;
        }
        try {
            byte[] nonce = new byte[NONCE_BYTES];
            SECURE_RANDOM.nextBytes(nonce);
            Cipher cipher = newCipher(Cipher.ENCRYPT_MODE, nonce);
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] combined = new byte[NONCE_BYTES + ciphertext.length];
            System.arraycopy(nonce, 0, combined, 0, NONCE_BYTES);
            System.arraycopy(ciphertext, 0, combined, NONCE_BYTES, ciphertext.length);
            return Base64.getEncoder().encodeToString(combined);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("敏感字段加密失败", e);
        }
    }

    /**
     * 解密敏感字段
     *
     * @param ciphertext Base64(nonce + 密文 + GCM 认证标签)
     * @return 明文，输入为空时原样返回
     */
    public static String decrypt(String ciphertext) {
        if (ciphertext == null || ciphertext.isEmpty()) {
            return ciphertext;
        }
        try {
            byte[] combined = Base64.getDecoder().decode(ciphertext);
            if (combined.length <= NONCE_BYTES) {
                throw new IllegalStateException("敏感字段密文格式非法");
            }
            Cipher cipher = newCipher(Cipher.DECRYPT_MODE, combined);
            return new String(cipher.doFinal(combined, NONCE_BYTES, combined.length - NONCE_BYTES),
                    StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            throw new IllegalStateException("敏感字段解密失败（若为升级前的明文数据，请重新保存授权信息）", e);
        }
    }

    private static Cipher newCipher(int mode, byte[] noncePrefix) throws GeneralSecurityException {
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        cipher.init(mode, requireKey(), new GCMParameterSpec(GCM_TAG_BITS, noncePrefix, 0, NONCE_BYTES));
        cipher.updateAAD(AAD);
        return cipher;
    }

    private static SecretKeySpec requireKey() {
        SecretKeySpec current = key;
        if (current == null) {
            throw new IllegalStateException("敏感字段加密密钥未初始化");
        }
        return current;
    }
}
