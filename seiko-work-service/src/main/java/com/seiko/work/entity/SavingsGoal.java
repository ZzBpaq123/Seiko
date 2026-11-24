package com.seiko.work.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.seiko.common.base.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serial;

/**
 * 攒钱目标配置实体
 * <p>
 * 一个用户一条记录，把每月收入按比例分配到若干档位。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("work_savings_goal")
@Schema(description = "攒钱目标配置实体")
public class SavingsGoal extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 用户ID
     */
    @TableField("user_id")
    @Schema(description = "用户ID")
    private Long userId;

    /**
     * 目标名称
     */
    @TableField("name")
    @Schema(description = "目标名称")
    private String name;

    /**
     * 分配档位的 JSON 数组字符串，与档位列表的互转在 Service 层完成
     * （形如 [{"name":"储蓄","percent":70,"saving":true}]）
     */
    @TableField("buckets")
    @Schema(description = "分配档位 JSON 字符串")
    private String buckets;

    /**
     * 每月发薪日期(1-31)，必填，默认 1 号；前端据此把「本月」换成「本发薪周期」。
     * <p>
     * updateStrategy = ALWAYS：保存接口是整体覆盖，显式写出该字段，
     * 避免 MyBatis-Plus 默认的 NOT_NULL 策略在值为 null 时静默跳过更新。
     */
    @TableField(value = "salary_day", updateStrategy = FieldStrategy.ALWAYS)
    @Schema(description = "每月发薪日期(1-31)，null 表示未配置")
    private Integer salaryDay;

}
