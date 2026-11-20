package com.seiko.work.controller;

import cn.dev33.satoken.annotation.SaCheckLogin;
import cn.dev33.satoken.stp.StpUtil;
import com.seiko.common.result.Result;
import com.seiko.work.dto.SavingsGoalDTO;
import com.seiko.work.service.SavingsGoalService;
import com.seiko.work.vo.SavingsGoalVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 攒钱目标 Controller
 * <p>
 * 一个用户一条配置，因此只有查询与整体保存两个接口，不做单条增删改。
 */
@RestController
@RequestMapping("/api/savings-goal")
@RequiredArgsConstructor
@Validated
@SaCheckLogin
@Tag(name = "攒钱目标", description = "每月收入分配目标配置")
public class SavingsGoalController {

    private final SavingsGoalService savingsGoalService;

    @GetMapping
    @Operation(summary = "查询攒钱目标（未配置时 data 为 null）")
    public Result<SavingsGoalVO> get() {
        return Result.success(savingsGoalService.getByUserId(StpUtil.getLoginIdAsLong()));
    }

    @PutMapping
    @Operation(summary = "保存攒钱目标（整体覆盖）")
    public Result<Void> save(@Valid @RequestBody SavingsGoalDTO dto) {
        savingsGoalService.saveGoal(StpUtil.getLoginIdAsLong(), dto);
        return Result.success();
    }

}
