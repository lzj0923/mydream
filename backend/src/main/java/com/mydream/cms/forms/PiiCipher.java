package com.mydream.cms.forms;

import com.mydream.cms.config.CmsProperties;
import com.mydream.cms.shared.ApiException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

@Component
public class PiiCipher {
    private static final int IV_BYTES = 12;
    private final byte[] key;
    private final SecureRandom random = new SecureRandom();

    public PiiCipher(CmsProperties properties) {
        var encoded = properties.piiKeyBase64();
        if (encoded == null || encoded.isBlank()) {
            key = null;
        } else {
            try {
                key = Base64.getDecoder().decode(encoded);
            } catch (IllegalArgumentException exception) {
                throw new IllegalStateException("CMS_PII_KEY_BASE64 不是合法 Base64", exception);
            }
            if (key.length != 32) throw new IllegalStateException("CMS_PII_KEY_BASE64 解码后必须为 32 字节");
        }
    }

    public String encrypt(String plaintext) {
        requireConfigured();
        var iv = new byte[IV_BYTES];
        random.nextBytes(iv);
        try {
            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
            var ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(ByteBuffer.allocate(iv.length + ciphertext.length).put(iv).put(ciphertext).array());
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("表单数据加密失败", exception);
        }
    }

    public String decrypt(String encoded) {
        requireConfigured();
        try {
            var packed = Base64.getDecoder().decode(encoded);
            if (packed.length <= IV_BYTES) throw new GeneralSecurityException("密文长度不正确");
            var iv = java.util.Arrays.copyOfRange(packed, 0, IV_BYTES);
            var ciphertext = java.util.Arrays.copyOfRange(packed, IV_BYTES, packed.length);
            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            throw new IllegalStateException("表单数据解密失败", exception);
        }
    }

    private void requireConfigured() {
        if (key == null) throw ApiException.unavailable("尚未配置 CMS_PII_KEY_BASE64，表单暂不可用");
    }
}
