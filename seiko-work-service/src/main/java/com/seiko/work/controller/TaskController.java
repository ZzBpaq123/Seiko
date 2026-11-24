package com.seiko.work.controller;

import cn.dev33.satoken.annotation.SaCheckLogin;
import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.seiko.common.result.Result;
import com.seiko.work.dto.TaskDTO;
import com.seiko.work.service.TaskService;
import com.seiko.work.vo.TaskVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 工作事项 Controller
 */
@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
@Validated
@SaCheckLogin
@Tag(name = "工作事项", description = "任务增删改查、今日工作")
public class TaskController {

    private final TaskService taskService;

    @GetMapping
    @Operation(summary = "任务列表")
    public Result<Page<TaskVO>> page(
            @RequestParam(defaultValue = "1") @Min(1) Long current,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) Long size) {
        return Result.success(taskService.pageTasks(StpUtil.getLoginIdAsLong(), current, size));
    }

    @GetMapping("/today")
    @Operation(summary = "今日工作")
    public Result<List<TaskVO>> today() {
        return Result.success(taskService.listToday(StpUtil.getLoginIdAsLong()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "任务详情")
    public Result<TaskVO> getById(@PathVariable Long id) {
        return Result.success(taskService.getOwned(id, StpUtil.getLoginIdAsLong()));
    }

    @PostMapping
    @Operation(summary = "创建任务")
    public Result<Void> save(@Valid @RequestBody TaskDTO dto) {
        taskService.createTask(StpUtil.getLoginIdAsLong(), dto);
        return Result.success();
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新任务")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody TaskDTO dto) {
        taskService.updateTask(id, StpUtil.getLoginIdAsLong(), dto);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除任务")
    public Result<Void> delete(@PathVariable Long id) {
        taskService.deleteTask(id, StpUtil.getLoginIdAsLong());
        return Result.success();
    }

}
