package com.seiko.work.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.seiko.common.base.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serial;
import java.util.Date;

/**
 * 日程事件实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("work_event")
@Schema(description = "日程事件实体")
public class Event extends BaseEntity {

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
     * 开始时间
     */
    @TableField("start_time")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Schema(description = "开始时间")
    private Date startTime;

    /**
     * 结束时间
     */
    @TableField("end_time")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Schema(description = "结束时间")
    private Date endTime;

    /**
     * 是否全天：0-否，1-是
     */
    @TableField("is_all_day")
    @Schema(description = "是否全天：0-否，1-是")
    private Integer isAllDay;

    /**
     * 地点
     */
    @TableField("location")
    @Schema(description = "地点")
    private String location;

    /**
     * 内容
     */
    @TableField("content")
    @Schema(description = "内容")
    private String content;

}
