package com.seiko.work.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.Date;

/**
 * 日程事件 DTO
 */
@Data
@Schema(description = "日程事件请求参数")
public class EventDTO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @NotBlank(message = "标题不能为空")
    @Schema(description = "标题", requiredMode = Schema.RequiredMode.REQUIRED)
    @Size(max = 255)
    private String title;

    @NotNull(message = "开始时间不能为空")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Schema(description = "开始时间", requiredMode = Schema.RequiredMode.REQUIRED)
    private Date startTime;

    @NotNull(message = "结束时间不能为空")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Schema(description = "结束时间", requiredMode = Schema.RequiredMode.REQUIRED)
    private Date endTime;

    @NotNull(message = "是否全天不能为空")
    @Schema(description = "是否全天：0-否，1-是", requiredMode = Schema.RequiredMode.REQUIRED)
    @Min(0)
    @Max(1)
    private Integer isAllDay;

    @Schema(description = "地点")
    @Size(max = 255)
    private String location;

    @NotBlank(message = "内容不能为空")
    @Schema(description = "内容", requiredMode = Schema.RequiredMode.REQUIRED)
    @Size(max = 500)
    private String content;

    @JsonIgnore
    @AssertTrue(message = "结束时间不能早于开始时间")
    @Schema(hidden = true)
    public boolean isEndTimeAfterStartTime() {
        return startTime == null || endTime == null || !endTime.before(startTime);
    }

}
