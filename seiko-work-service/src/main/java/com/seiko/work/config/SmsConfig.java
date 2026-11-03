package com.seiko.work.config;

import com.seiko.work.base.ResultCode;
import com.seiko.work.exception.BusinessException;
import com.seiko.work.service.SmsService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("!dev")
public class SmsConfig {
    @Bean
    @ConditionalOnMissingBean(SmsService.class)
    public SmsService unavailableSmsService() {
        return (phone, code) -> { throw new BusinessException(ResultCode.VERIFICATION_CODE_SEND_FAILED); };
    }
}
