package com.seiko.work.service.impl;

import com.seiko.work.service.SmsService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.context.annotation.Profile;

/**
 * 模拟短信服务实现
 * <p>
 * 仅打印日志，用于本地开发调试。后续替换真实短信服务商时，
 * 可新增实现类并标记 {@code @Primary} 或配合 {@code @Qualifier} 注入。
 */
@Slf4j
@Service
@Profile("dev")
public class MockSmsServiceImpl implements SmsService {

    @Override
    public void send(String phone, String code) {
        log.info("【模拟短信】向手机号 {} 发送验证码：{}", phone, code);
    }

}
