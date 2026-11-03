package com.seiko.work.service;

import com.seiko.work.base.ResultCode;
import com.seiko.work.config.properties.SecurityProperties;
import com.seiko.work.enums.VerificationPurpose;
import com.seiko.work.exception.BusinessException;
import com.seiko.work.util.EmailCodeUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import org.springframework.util.DigestUtils;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.function.Consumer;

/** Redis scripts keep send reservations and one-time verification atomic across instances. */
@Service
@RequiredArgsConstructor
public class VerificationCodeService {
    static final DefaultRedisScript<Long> RESERVE = script("reserve");
    static final DefaultRedisScript<Long> PUBLISH = script("publish");
    static final DefaultRedisScript<Long> RELEASE = script("release");
    static final DefaultRedisScript<Long> CONSUME = script("consume");
    private final StringRedisTemplate redisTemplate;
    private final SecurityProperties securityProperties;

    public static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    public void send(boolean email, String contact, VerificationPurpose purpose, Long owner,
                     String ip, Consumer<String> sender) {
        boolean enabled = email ? Boolean.TRUE.equals(securityProperties.getEmailCode().getEnabled())
                : Boolean.TRUE.equals(securityProperties.getPhoneCode().getEnabled());
        if (!enabled) throw new BusinessException(ResultCode.VERIFICATION_CODE_SEND_FAILED);
        int length = email ? securityProperties.getEmailCode().getCodeLength()
                : securityProperties.getPhoneCode().getCodeLength();
        long cooldown = email ? securityProperties.getEmailCode().getResendCooldownSeconds()
                : securityProperties.getPhoneCode().getResendCooldownSeconds();
        long ttl = email ? securityProperties.getEmailCode().getCodeTtlSeconds()
                : securityProperties.getPhoneCode().getCodeTtlSeconds();
        int maxSends = email ? securityProperties.getEmailCode().getIpMaxSendsPerHour()
                : securityProperties.getPhoneCode().getIpMaxSendsPerHour();
        if (length != 6 || cooldown < 1 || ttl < 1 || maxSends < 1) {
            throw new IllegalStateException("验证码安全配置无效");
        }
        String channel = email ? "email" : "phone";
        String recipient = email ? normalizeEmail(contact) : contact;
        String cooldownKey = "verification:v2:" + channel + ":cooldown:" + hash(recipient);
        String ipKey = "verification:v2:" + channel + ":ip:" + hash(ip);
        String token = UUID.randomUUID().toString();
        if (!Long.valueOf(1).equals(redisTemplate.execute(RESERVE, List.of(cooldownKey, ipKey),
                token, String.valueOf(Math.max(60, cooldown)), String.valueOf(maxSends)))) {
            throw new BusinessException(ResultCode.VERIFICATION_CODE_TOO_FREQUENT);
        }
        try {
            String code = EmailCodeUtil.generate(length);
            sender.accept(code);
            if (!Long.valueOf(1).equals(redisTemplate.execute(PUBLISH,
                    List.of(cooldownKey, codeKey(email, recipient, purpose, owner)),
                    token, code, String.valueOf(ttl)))) {
                throw new BusinessException(ResultCode.VERIFICATION_CODE_SEND_FAILED);
            }
        } catch (RuntimeException e) {
            // Retain the IP budget on delivery failure to prevent abuse of a failing provider.
            redisTemplate.execute(RELEASE, List.of(cooldownKey), token);
            throw new BusinessException(ResultCode.VERIFICATION_CODE_SEND_FAILED);
        }
    }

    public void consume(boolean email, String contact, VerificationPurpose purpose, Long owner, String code) {
        boolean enabled = email ? Boolean.TRUE.equals(securityProperties.getEmailCode().getEnabled())
                : Boolean.TRUE.equals(securityProperties.getPhoneCode().getEnabled());
        if (!enabled) throw new BusinessException(ResultCode.VERIFICATION_CODE_ERROR);
        if (code == null || !code.matches("[0-9]{6}") || !Long.valueOf(1).equals(redisTemplate.execute(
                CONSUME, List.of(codeKey(email, contact, purpose, owner)), code))) {
            throw new BusinessException(ResultCode.VERIFICATION_CODE_ERROR);
        }
    }

    static String codeKey(boolean email, String contact, VerificationPurpose purpose, Long owner) {
        if (purpose == VerificationPurpose.BIND && owner == null) {
            throw new IllegalArgumentException("绑定验证码必须关联用户");
        }
        return "verification:v2:" + (email ? "email" : "phone") + ":" + purpose.name() + ":"
                + (purpose == VerificationPurpose.BIND ? owner : "public") + ":"
                + hash(email ? normalizeEmail(contact) : contact);
    }

    private static String hash(String value) {
        return DigestUtils.md5DigestAsHex(value.getBytes(StandardCharsets.UTF_8));
    }

    private static DefaultRedisScript<Long> script(String name) {
        DefaultRedisScript<Long> script = new DefaultRedisScript<>();
        script.setLocation(new ClassPathResource("redis/verification-" + name + ".lua"));
        script.setResultType(Long.class);
        return script;
    }
}
