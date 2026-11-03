package com.seiko.work.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import com.seiko.work.base.ResultCode;
import com.seiko.work.config.properties.SecurityProperties;
import com.seiko.work.constant.RedisKey;
import com.seiko.work.exception.BusinessException;
import com.seiko.work.dto.ChangePasswordDTO;
import com.seiko.work.dto.LoginDTO;
import com.seiko.work.dto.PhoneLoginDTO;
import com.seiko.work.dto.PhoneRegisterDTO;
import com.seiko.work.dto.RegisterDTO;
import com.seiko.work.dto.ResetPasswordDTO;
import com.seiko.work.dto.SendEmailCodeDTO;
import com.seiko.work.dto.SendPhoneCodeDTO;
import com.seiko.work.dto.SendResetCodeDTO;
import com.seiko.work.dto.UserProfileUpdateDTO;
import com.seiko.work.entity.User;
import com.seiko.work.service.AuthService;
import com.seiko.work.service.VerificationCodeService;
import com.seiko.work.enums.VerificationPurpose;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import com.seiko.work.service.SmsService;
import com.seiko.work.service.UserService;
import com.seiko.work.vo.LoginVO;
import com.seiko.work.vo.UserVO;
import com.seiko.work.util.IpUtils;
import com.seiko.work.util.PasswordUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

/**
 * 认证 Service 实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final VerificationCodeService verificationCodeService;
    private final UserService userService;
    private final StringRedisTemplate redisTemplate;
    private final JavaMailSender mailSender;
    private final SmsService smsService;
    private final SecurityProperties securityProperties;
    private final HttpServletRequest request;

    @Value("${spring.mail.username:}")
    private String senderEmail;

    @Override
    public void sendEmailCode(SendEmailCodeDTO dto) {
        doSendEmailCode(dto.getEmail(), VerificationPurpose.REGISTER, null);
    }

    @Override
    public void sendBindEmailCode(SendEmailCodeDTO dto) {
        doSendEmailCode(dto.getEmail(), VerificationPurpose.BIND, StpUtil.getLoginIdAsLong());
    }

    private void doSendEmailCode(String email, VerificationPurpose purpose, Long owner) {
        String normalized = VerificationCodeService.normalizeEmail(email);
        verificationCodeService.send(true, normalized, purpose, owner,
                IpUtils.getClientIp(request, securityProperties.getTrustedProxies()), code -> {
                    SimpleMailMessage message = new SimpleMailMessage();
                    message.setTo(normalized);
                    message.setSubject(securityProperties.getEmailCode().getSubject());
                    String operation = switch (purpose) {
                        case REGISTER -> "注册";
                        case LOGIN -> "登录";
                        case RESET -> "重置密码";
                        case BIND -> "绑定邮箱";
                    };
                    message.setText("您正在进行" + operation + "操作，验证码为：" + code
                            + "。请勿将验证码提供给他人。");
                    message.setFrom(securityProperties.getEmailCode().getSenderName() + " <" + getSenderEmail() + ">");
                    mailSender.send(message);
                });
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void emailRegister(RegisterDTO dto) {
        String email = VerificationCodeService.normalizeEmail(dto.getEmail());
        verificationCodeService.consume(true, email, VerificationPurpose.REGISTER, null, dto.getCode());

        String username = dto.getUsername() != null && !dto.getUsername().isBlank() ? dto.getUsername().trim() : null;
        if (userService.getByUsername(username) != null) {
            throw new BusinessException(ResultCode.USERNAME_EXISTS);
        }

        if (userService.getByEmail(email) != null) {
            throw new BusinessException(ResultCode.CONFLICT.getCode(), "该邮箱已被注册");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(PasswordUtil.hash(dto.getPassword()));
        user.setStatus(1);
        try {
            userService.save(user);
        } catch (DuplicateKeyException e) {
            throw new BusinessException(ResultCode.CONFLICT.getCode(), "用户名或邮箱已被占用");
        }

        log.info("用户 {} 注册成功", username);
    }

    @Override
    public LoginVO emailLogin(LoginDTO dto) {
        String email = VerificationCodeService.normalizeEmail(dto.getEmail());
        String ip = IpUtils.getClientIp(request, securityProperties.getTrustedProxies());

        if (Boolean.TRUE.equals(securityProperties.getLoginRateLimit().getEnabled())) {
            checkLoginLock(email, ip);
        }

        User user = userService.getByEmail(email);
        if (user == null) {
            handleLoginFailure(email, ip);
            throw new BusinessException(ResultCode.LOGIN_ERROR);
        }

        if (user.getStatus() != null && user.getStatus() == 0) {
            throw new BusinessException(ResultCode.USER_DISABLED);
        }

        if (!PasswordUtil.matches(dto.getPassword(), user.getPassword())) {
            handleLoginFailure(email, ip);
            throw new BusinessException(ResultCode.LOGIN_ERROR);
        }

        // 登录成功只清除此账号的失败计数，不能清除整个 IP 的失败历史
        clearLoginFailure(email);

        StpUtil.login(user.getId());

        LoginVO loginVO = new LoginVO();
        loginVO.setToken(StpUtil.getTokenValue());
        loginVO.setTokenName(StpUtil.getTokenName());
        loginVO.setUser(convertToVO(user));

        log.info("用户 {} 登录成功", email);
        return loginVO;
    }

    @Override
    public void sendPhoneCode(SendPhoneCodeDTO dto) {
        if (dto.getPurpose() != VerificationPurpose.REGISTER && dto.getPurpose() != VerificationPurpose.LOGIN) {
            throw new BusinessException(ResultCode.PARAM_ERROR);
        }
        doSendPhoneCode(dto.getPhone(), dto.getPurpose(), null);
    }

    @Override
    public void sendBindPhoneCode(SendPhoneCodeDTO dto) {
        doSendPhoneCode(dto.getPhone(), VerificationPurpose.BIND, StpUtil.getLoginIdAsLong());
    }

    private void doSendPhoneCode(String phone, VerificationPurpose purpose, Long owner) {
        verificationCodeService.send(false, phone, purpose, owner,
                IpUtils.getClientIp(request, securityProperties.getTrustedProxies()), code -> smsService.send(phone, code));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void phoneRegister(PhoneRegisterDTO dto) {
        String phone = dto.getPhone();
        verificationCodeService.consume(false, phone, VerificationPurpose.REGISTER, null, dto.getCode());

        String username = dto.getUsername() != null && !dto.getUsername().isBlank() ? dto.getUsername().trim() : null;
        if (userService.getByUsername(username) != null) {
            throw new BusinessException(ResultCode.USERNAME_EXISTS);
        }

        if (userService.getByPhone(phone) != null) {
            throw new BusinessException(ResultCode.CONFLICT.getCode(), "该手机号已被注册");
        }

        User user = new User();
        user.setUsername(username);
        user.setPhone(phone);
        if (dto.getPassword() != null && !dto.getPassword().isEmpty()) {
            user.setPassword(PasswordUtil.hash(dto.getPassword()));
        }
        user.setStatus(1);
        try {
            userService.save(user);
        } catch (DuplicateKeyException e) {
            throw new BusinessException(ResultCode.CONFLICT.getCode(), "用户名或手机号已被占用");
        }

        log.info("用户 {} 手机号注册成功", username);
    }

    @Override
    public LoginVO phoneLogin(PhoneLoginDTO dto) {
        String phone = dto.getPhone();
        String ip = IpUtils.getClientIp(request, securityProperties.getTrustedProxies());

        if (Boolean.TRUE.equals(securityProperties.getLoginRateLimit().getEnabled())) {
            checkLoginLock(phone, ip);
        }

        User user = userService.getByPhone(phone);
        if (user == null) {
            handleLoginFailure(phone, ip);
            throw new BusinessException(ResultCode.LOGIN_ERROR);
        }

        if (user.getStatus() != null && user.getStatus() == 0) {
            throw new BusinessException(ResultCode.USER_DISABLED);
        }

        try {
            verificationCodeService.consume(false, phone, VerificationPurpose.LOGIN, null, dto.getCode());
        } catch (BusinessException e) {
            handleLoginFailure(phone, ip);
            throw new BusinessException(ResultCode.LOGIN_ERROR);
        }

        clearLoginFailure(phone);

        StpUtil.login(user.getId());

        LoginVO loginVO = new LoginVO();
        loginVO.setToken(StpUtil.getTokenValue());
        loginVO.setTokenName(StpUtil.getTokenName());
        loginVO.setUser(convertToVO(user));

        log.info("用户 {} 手机号登录成功", phone);
        return loginVO;
    }

    @Override
    public void sendResetCode(SendResetCodeDTO dto) {
        String email = VerificationCodeService.normalizeEmail(dto.getEmail());
        if (email != null && !email.isBlank()) {
            if (userService.getByEmail(email) != null) {
                doSendEmailCode(email, VerificationPurpose.RESET, null);
            }
            return;
        }
        String phone = dto.getPhone();
        if (userService.getByPhone(phone) != null) {
            doSendPhoneCode(phone, VerificationPurpose.RESET, null);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void resetPassword(ResetPasswordDTO dto) {
        String email = VerificationCodeService.normalizeEmail(dto.getEmail());
        boolean byEmail = email != null && !email.isBlank();
        String contact = byEmail ? email : dto.getPhone();
        verificationCodeService.consume(byEmail, contact, VerificationPurpose.RESET, null, dto.getCode());
        User user = byEmail ? userService.getByEmail(email) : userService.getByPhone(contact);
        if (user == null) throw new BusinessException(ResultCode.VERIFICATION_CODE_ERROR);
        updatePassword(user.getId(), dto.getPassword());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void changePassword(ChangePasswordDTO dto) {
        Long userId = StpUtil.getLoginIdAsLong();
        User user = userService.getById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.TOKEN_INVALID);
        }

        if (user.getPassword() == null || user.getPassword().isBlank()) {
            throw new BusinessException(ResultCode.ERROR.getCode(), "当前账号未设置密码，请使用找回密码功能");
        }

        if (!PasswordUtil.matches(dto.getOldPassword(), user.getPassword())) {
            throw new BusinessException(ResultCode.OLD_PASSWORD_ERROR);
        }

        updatePassword(userId, dto.getPassword());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserVO updateProfile(UserProfileUpdateDTO dto) {
        Long userId = StpUtil.getLoginIdAsLong();
        User user = userService.getById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.TOKEN_INVALID);
        }

        String username = dto.getUsername() != null && !dto.getUsername().isBlank() ? dto.getUsername().trim() : null;
        if (username != null && !username.equals(user.getUsername())) {
            User exists = userService.getByUsername(username);
            if (exists != null && !exists.getId().equals(userId)) {
                throw new BusinessException(ResultCode.USERNAME_EXISTS);
            }
            user.setUsername(username);
        }

        String email = dto.getEmail() != null && !dto.getEmail().isBlank()
                ? VerificationCodeService.normalizeEmail(dto.getEmail()) : null;
        if (email != null && !email.equals(user.getEmail())) {
            User exists = userService.getByEmail(email);
            if (exists != null && !exists.getId().equals(userId)) {
                throw new BusinessException(ResultCode.CONFLICT.getCode(), "该邮箱已被其他账号绑定");
            }
            verificationCodeService.consume(true, email, VerificationPurpose.BIND, userId, dto.getEmailCode());
            user.setEmail(email);
        }

        String phone = dto.getPhone() != null && !dto.getPhone().isBlank() ? dto.getPhone().trim() : null;
        if (phone != null && !phone.equals(user.getPhone())) {
            User exists = userService.getByPhone(phone);
            if (exists != null && !exists.getId().equals(userId)) {
                throw new BusinessException(ResultCode.CONFLICT.getCode(), "该手机号已被其他账号绑定");
            }
            verificationCodeService.consume(false, phone, VerificationPurpose.BIND, userId, dto.getPhoneCode());
            user.setPhone(phone);
        }

        String avatar = dto.getAvatar() != null && !dto.getAvatar().isBlank() ? dto.getAvatar().trim() : null;
        user.setAvatar(avatar);

        try {
            User patch = new User();
            patch.setId(userId);
            patch.setUsername(user.getUsername());
            patch.setEmail(user.getEmail());
            patch.setPhone(user.getPhone());
            patch.setAvatar(user.getAvatar());
            userService.updateById(patch);
        } catch (DuplicateKeyException e) {
            throw new BusinessException(ResultCode.CONFLICT.getCode(), "用户名、邮箱或手机号已被占用");
        }
        log.info("用户 {} 修改个人信息成功", user.getUsername());
        return convertToVO(user);
    }

    @Override
    public void logout() {
        StpUtil.logout();
    }

    @Override
    public UserVO getCurrentUser() {
        Long userId = StpUtil.getLoginIdAsLong();
        User user = userService.getById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.TOKEN_INVALID);
        }
        return convertToVO(user);
    }

    private void updatePassword(Long userId, String password) {
        User patch = new User();
        patch.setId(userId);
        patch.setPassword(PasswordUtil.hash(password));
        if (!userService.updateById(patch)) throw new BusinessException(ResultCode.NOT_FOUND);
        // Do not revoke sessions before a transaction that might still roll back.
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    StpUtil.logout(userId);
                }
            });
        } else {
            StpUtil.logout(userId);
        }
    }

    private void checkLoginLock(String email, String ip) {
        String accountLockKey = RedisKey.LOGIN_ACCOUNT_LOCK.formatted(email);
        String ipLockKey = RedisKey.LOGIN_IP_LOCK.formatted(ip);
        if (redisTemplate.hasKey(accountLockKey)) {
            throw new BusinessException(ResultCode.TOO_MANY_REQUESTS.getCode(), "账号已被锁定，请稍后再试");
        }
        if (redisTemplate.hasKey(ipLockKey)) {
            throw new BusinessException(ResultCode.TOO_MANY_REQUESTS.getCode(), "IP 已被锁定，请稍后再试");
        }
    }

    private void handleLoginFailure(String email, String ip) {
        if (!Boolean.TRUE.equals(securityProperties.getLoginRateLimit().getEnabled())) {
            return;
        }

        long windowSeconds = securityProperties.getLoginRateLimit().getWindowSeconds();
        long lockSeconds = securityProperties.getLoginRateLimit().getLockSeconds();

        incrementFailCount(RedisKey.LOGIN_ACCOUNT_FAIL.formatted(email),
                securityProperties.getLoginRateLimit().getMaxAttempts(),
                RedisKey.LOGIN_ACCOUNT_LOCK.formatted(email), windowSeconds, lockSeconds);

        incrementFailCount(RedisKey.LOGIN_IP_FAIL.formatted(ip),
                securityProperties.getLoginRateLimit().getIpMaxAttempts(),
                RedisKey.LOGIN_IP_LOCK.formatted(ip), windowSeconds, lockSeconds);
    }

    private void incrementFailCount(String failKey, int maxAttempts, String lockKey, long windowSeconds, long lockSeconds) {
        Long count = redisTemplate.opsForValue().increment(failKey);
        if (count != null && count == 1) {
            redisTemplate.expire(failKey, Duration.ofSeconds(windowSeconds));
        }
        if (count != null && count >= maxAttempts) {
            redisTemplate.opsForValue().set(lockKey, "1", Duration.ofSeconds(lockSeconds));
        }
    }

    private void clearLoginFailure(String email) {
        if (!Boolean.TRUE.equals(securityProperties.getLoginRateLimit().getEnabled())) {
            return;
        }
        redisTemplate.delete(RedisKey.LOGIN_ACCOUNT_FAIL.formatted(email));
    }

    private String getSenderEmail() {
        return senderEmail != null ? senderEmail : "";
    }

    private UserVO convertToVO(User user) {
        UserVO vo = new UserVO();
        vo.setId(user.getId());
        vo.setUsername(user.getUsername());
        vo.setEmail(user.getEmail());
        vo.setPhone(user.getPhone());
        vo.setNickname(user.getNickname());
        vo.setAvatar(user.getAvatar());
        vo.setStatus(user.getStatus());
        return vo;
    }

}
