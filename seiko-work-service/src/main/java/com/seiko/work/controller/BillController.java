package com.seiko.work.controller;

import cn.dev33.satoken.annotation.SaCheckLogin;
import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.seiko.common.result.Result;
import com.seiko.work.dto.BillDTO;
import com.seiko.work.enums.BillStatPeriodEnum;
import com.seiko.work.service.BillService;
import com.seiko.work.vo.BillCategoryStatVO;
import com.seiko.work.vo.BillOverviewVO;
import com.seiko.work.vo.BillSummaryVO;
import com.seiko.work.vo.BillTrendVO;
import com.seiko.work.vo.BillVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * 账单记录 Controller
 * <p>
 * 所有接口都需要登录，用户身份取自 Sa-Token 会话，不接受前端传入 userId。
 */
@RestController
@RequestMapping("/api/bills")
@Validated
@SaCheckLogin
@Tag(name = "账单记录", description = "账单增删改查与日/周/月/年统计")
public class BillController {

    @Autowired
    private BillService billService;

    @GetMapping
    @Operation(summary = "账单明细分页列表")
    public Result<Page<BillVO>> page(
            @RequestParam(defaultValue = "1") @Min(1) Long current,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) Long size,
            @Parameter(description = "账单类型：0-支出，1-收入，不传表示全部")
            @RequestParam(required = false) @Min(0) @Max(1) Integer type,
            @Parameter(description = "分类，不传表示全部")
            @RequestParam(required = false) String category,
            @Parameter(description = "起始日期 yyyy-MM-dd（含）")
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @Parameter(description = "结束日期 yyyy-MM-dd（含）")
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate) {
        return Result.success(billService.pageBills(StpUtil.getLoginIdAsLong(), current, size,
                type, category, startDate, endDate));
    }

    @GetMapping("/overview")
    @Operation(summary = "账单概览（今日/本周/本月/本年）")
    public Result<BillOverviewVO> overview() {
        return Result.success(billService.overview(StpUtil.getLoginIdAsLong()));
    }

    @GetMapping("/summary")
    @Operation(summary = "指定周期汇总（收入/支出/结余/笔数）")
    public Result<BillSummaryVO> summary(
            @Parameter(description = "起始日期 yyyy-MM-dd（含），缺省为本月 1 号")
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @Parameter(description = "结束日期 yyyy-MM-dd（含），缺省为今天")
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate) {
        return Result.success(billService.summary(StpUtil.getLoginIdAsLong(), startDate, endDate));
    }

    @GetMapping("/trend")
    @Operation(summary = "趋势统计（按天/周/月/年）")
    public Result<List<BillTrendVO>> trend(
            @Parameter(description = "统计粒度：DAY / WEEK / MONTH / YEAR，缺省 DAY")
            @RequestParam(defaultValue = "DAY") BillStatPeriodEnum period,
            @Parameter(description = "起始日期 yyyy-MM-dd（含），缺省按粒度给默认区间")
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @Parameter(description = "结束日期 yyyy-MM-dd（含），缺省按粒度给默认区间")
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate) {
        return Result.success(billService.trend(StpUtil.getLoginIdAsLong(), startDate, endDate, period));
    }

    @GetMapping("/category-stat")
    @Operation(summary = "分类统计（含支出占比）")
    public Result<List<BillCategoryStatVO>> categoryStat(
            @Parameter(description = "起始日期 yyyy-MM-dd（含），缺省为本月 1 号")
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @Parameter(description = "结束日期 yyyy-MM-dd（含），缺省为今天")
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate) {
        return Result.success(billService.categoryStat(StpUtil.getLoginIdAsLong(), startDate, endDate));
    }

    @GetMapping("/{id}")
    @Operation(summary = "账单详情")
    public Result<BillVO> getById(@PathVariable Long id) {
        return Result.success(billService.getOwned(id, StpUtil.getLoginIdAsLong()));
    }

    @PostMapping
    @Operation(summary = "新增账单")
    public Result<Void> save(@Valid @RequestBody BillDTO dto) {
        billService.createBill(StpUtil.getLoginIdAsLong(), dto);
        return Result.success();
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新账单")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody BillDTO dto) {
        billService.updateBill(id, StpUtil.getLoginIdAsLong(), dto);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除账单")
    public Result<Void> delete(@PathVariable Long id) {
        billService.deleteBill(id, StpUtil.getLoginIdAsLong());
        return Result.success();
    }

}
