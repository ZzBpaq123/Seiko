package com.seiko.work.controller;

import cn.dev33.satoken.annotation.SaCheckLogin;
import cn.dev33.satoken.stp.StpUtil;
import com.seiko.common.result.Result;
import com.seiko.work.dto.MailDTO;
import com.seiko.work.vo.MailAccountVO;
import com.seiko.work.vo.MailMessageVO;
import com.seiko.work.enums.MailProviderEnum;
import com.seiko.work.service.MailService;
import com.seiko.work.service.MailMessageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 邮件管理 Controller
 */
@RestController
@RequestMapping("/api/mails")
@RequiredArgsConstructor
@Validated
@SaCheckLogin
@Tag(name = "邮件管理", description = "邮箱授权配置与邮件管理")
public class MailController {

    private final MailService mailService;
    private final MailMessageService mailMessageService;

    @PostMapping("/account")
    @Operation(summary = "保存邮箱授权信息")
    public Result<Void> saveAccount(@Valid @RequestBody MailDTO dto) {
        mailService.saveAccount(StpUtil.getLoginIdAsLong(), dto);
        return Result.success();
    }

    @GetMapping("/account/providers")
    @Operation(summary = "支持的邮箱服务商列表")
    public Result<List<MailProviderEnum>> listProviders() {
        return Result.success(MailProviderEnum.all());
    }

    @GetMapping("/account")
    @Operation(summary = "查询邮箱授权配置")
    public Result<MailAccountVO> getAccount() {
        return Result.success(mailService.getAccountVO(StpUtil.getLoginIdAsLong()));
    }

    @GetMapping
    @Operation(summary = "获取最近邮件")
    public Result<List<MailMessageVO>> listRecent(
            @RequestParam(defaultValue = "50") @Min(1) @Max(100) Integer limit) {
        return Result.success(mailMessageService.listRecent(StpUtil.getLoginIdAsLong(), limit));
    }

    @GetMapping("/{messageUid}")
    @Operation(summary = "邮件详情")
    public Result<MailMessageVO> getDetail(@PathVariable String messageUid) {
        return Result.success(mailMessageService.getDetail(StpUtil.getLoginIdAsLong(), messageUid));
    }

    @PostMapping("/{messageUid}/read")
    @Operation(summary = "标记邮件已读")
    public Result<Void> markRead(@PathVariable String messageUid) {
        mailMessageService.markRead(StpUtil.getLoginIdAsLong(), messageUid);
        return Result.success();
    }

}
