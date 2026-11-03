package com.seiko.work.config;

import com.seiko.work.base.ResultCode;
import com.seiko.work.entity.Mail;
import com.seiko.work.enums.MailProviderEnum;
import com.seiko.work.exception.BusinessException;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/** Only reviewed provider endpoints may be used for outbound IMAP connections. */
@Component
public class MailServerPolicy {
    private static final Set<String> ALLOWED_HOSTS = Arrays.stream(MailProviderEnum.values())
            .map(MailProviderEnum::getImapHost).collect(Collectors.toUnmodifiableSet());

    public void validate(Mail account) {
        String host = account.getImapHost();
        if (host == null || !ALLOWED_HOSTS.contains(host.toLowerCase(Locale.ROOT))
                || !Integer.valueOf(993).equals(account.getImapPort())
                || !Boolean.TRUE.equals(account.getSslEnable())) {
            throw new BusinessException(ResultCode.PARAM_ERROR.getCode(), "仅支持已列出的邮箱服务商，必须使用 SSL 和 993 端口");
        }
        account.setImapHost(host.toLowerCase(Locale.ROOT));
    }
}
