package com.seiko.work.controller;

import cn.dev33.satoken.annotation.SaCheckLogin;
import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.seiko.common.result.Result;
import com.seiko.work.dto.EventDTO;
import com.seiko.work.service.EventService;
import com.seiko.work.vo.EventVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Date;
import java.util.List;

/**
 * 日程事件 Controller
 */
@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
@Validated
@SaCheckLogin
@Tag(name = "日程事件", description = "日程增删改查与范围查询")
public class EventController {

    private final EventService eventService;

    @GetMapping
    @Operation(summary = "日程列表")
    public Result<Page<EventVO>> page(
            @RequestParam(defaultValue = "1") @Min(1) Long current,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) Long size) {
        return Result.success(eventService.pageEvents(StpUtil.getLoginIdAsLong(), current, size));
    }

    @GetMapping("/range")
    @Operation(summary = "查询时间范围内的日程")
    public Result<List<EventVO>> range(
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") Date start,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") Date end) {
        return Result.success(eventService.listByTimeRange(StpUtil.getLoginIdAsLong(), start, end));
    }

    @GetMapping("/{id}")
    @Operation(summary = "日程详情")
    public Result<EventVO> getById(@PathVariable Long id) {
        return Result.success(eventService.getOwned(id, StpUtil.getLoginIdAsLong()));
    }

    @PostMapping
    @Operation(summary = "创建日程")
    public Result<Void> save(@Valid @RequestBody EventDTO dto) {
        eventService.createEvent(StpUtil.getLoginIdAsLong(), dto);
        return Result.success();
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新日程")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody EventDTO dto) {
        eventService.updateEvent(id, StpUtil.getLoginIdAsLong(), dto);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除日程")
    public Result<Void> delete(@PathVariable Long id) {
        eventService.deleteEvent(id, StpUtil.getLoginIdAsLong());
        return Result.success();
    }

}
