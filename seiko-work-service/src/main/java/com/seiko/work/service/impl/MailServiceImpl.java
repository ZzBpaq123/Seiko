package com.seiko.work.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.seiko.work.dto.MailDTO;
import com.seiko.work.entity.Mail;
import com.seiko.work.enums.MailProviderEnum;
import com.seiko.work.exception.BusinessException;
import com.seiko.work.mapper.MailMapper;
import com.seiko.work.service.MailService;
import com.seiko.work.vo.MailAccountVO;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import com.seiko.work.config.MailServerPolicy;

/**
 * 邮箱账号配置 Service 实现
 */
@Service
@RequiredArgsConstructor
public class MailServiceImpl extends ServiceImpl<MailMapper, Mail> implements MailService {

    private final MailServerPolicy mailServerPolicy;

    @Override
    public Mail getByUserId(Long userId) {
        LambdaQueryWrapper<Mail> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Mail::getUserId, userId);
        return baseMapper.selectOne(wrapper);
    }

    @Override
    public void saveAccount(Long userId, MailDTO dto) {
        Mail account = getByUserId(userId);
        if (account == null) {
            account = new Mail();
            account.setUserId(userId);
        }
        BeanUtils.copyProperties(dto, account);
        fillServerConfig(account);
        mailServerPolicy.validate(account);
        saveOrUpdate(account);
    }

    @Override
    public MailAccountVO getAccountVO(Long userId) {
        Mail account = getByUserId(userId);
        return account == null ? null : MailAccountVO.from(account);
    }

    /**
     * 服务器配置缺省时按邮箱后缀匹配服务商自动补全
     */
    private void fillServerConfig(Mail account) {
        MailProviderEnum provider = MailProviderEnum.resolve(account.getEmail());
        if (account.getImapHost() == null || account.getImapHost().isBlank()) {
            if (provider == null) {
                throw new BusinessException("无法自动识别该邮箱服务商，请手动填写 IMAP 服务器地址");
            }
            account.setImapHost(provider.getImapHost());
        }
        if (account.getImapPort() == null) {
            account.setImapPort(provider != null ? provider.getImapPort() : 993);
        }
        if (account.getSslEnable() == null) {
            account.setSslEnable(provider == null || provider.getSslEnable());
        }
    }

}
