package com.seiko.work.dto;

import com.seiko.work.enums.TaskPriorityEnum;
import com.seiko.work.enums.TaskStatusEnum;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import jakarta.validation.constraints.Size;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDate;

/**
 * 工作事项 DTO
 */
@Data
@Schema(description = "工作事项请求参数")
public class TaskDTO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @NotBlank(message = "标题不能为空")
    @Schema(description = "标题", requiredMode = Schema.RequiredMode.REQUIRED)
    @Size(max = 255)
    private String title;

    @Schema(description = "内容")
    private String content;

    @NotNull(message = "计划日期不能为空")
    @Schema(description = "计划日期", requiredMode = Schema.RequiredMode.REQUIRED)
    private LocalDate planDate;

    @NotNull(message = "状态不能为空")
    @Schema(description = "状态", requiredMode = Schema.RequiredMode.REQUIRED)
    private TaskStatusEnum status;

    @NotNull(message = "优先级不能为空")
    @Schema(description = "优先级", requiredMode = Schema.RequiredMode.REQUIRED)
    private TaskPriorityEnum priority;

}
