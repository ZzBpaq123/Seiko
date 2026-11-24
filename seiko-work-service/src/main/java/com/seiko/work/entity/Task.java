package com.seiko.work.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.seiko.common.base.BaseEntity;
import com.seiko.work.enums.TaskPriorityEnum;
import com.seiko.work.enums.TaskStatusEnum;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serial;
import java.time.LocalDate;

/**
 * 工作事项实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("work_task")
@Schema(description = "工作事项实体")
public class Task extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 用户ID
     */
    @TableField("user_id")
    @Schema(description = "用户ID")
    private Long userId;

    /**
     * 标题
     */
    @TableField("title")
    @Schema(description = "标题")
    private String title;

    /**
     * 内容
     */
    @TableField("content")
    @Schema(description = "内容")
    private String content;

    /**
     * 计划日期
     */
    @TableField("plan_date")
    @JsonFormat(pattern = "yyyy-MM-dd")
    @Schema(description = "计划日期")
    private LocalDate planDate;

    /**
     * 状态
     */
    @TableField("status")
    @Schema(description = "状态")
    private TaskStatusEnum status;

    /**
     * 优先级
     */
    @TableField("priority")
    @Schema(description = "优先级")
    private TaskPriorityEnum priority;

}
