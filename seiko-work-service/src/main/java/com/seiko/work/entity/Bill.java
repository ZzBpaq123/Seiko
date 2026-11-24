package com.seiko.work.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.seiko.common.base.BaseEntity;
import com.seiko.work.enums.BillTypeEnum;
import com.seiko.work.enums.PaymentMethodEnum;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serial;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 账单明细实体（一条记录 = 一笔消费/收入）
 * <p>
 * 金额恒为正数，收/支方向由 {@link #type} 决定。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("work_bill")
@Schema(description = "账单明细实体")
public class Bill extends BaseEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 用户ID
     */
    @TableField("user_id")
    @Schema(description = "用户ID")
    private Long userId;

    /**
     * 分类
     */
    @TableField("category")
    @Schema(description = "分类")
    private String category;

    /**
     * 账单类型
     */
    @TableField("type")
    @Schema(description = "账单类型")
    private BillTypeEnum type;

    /**
     * 金额（元），恒为正数
     */
    @TableField("amount")
    @Schema(description = "金额（元），恒为正数")
    private BigDecimal amount;

    /**
     * 账单日期（日/周/月/年统计均基于该字段）
     */
    @TableField("bill_date")
    @JsonFormat(pattern = "yyyy-MM-dd")
    @Schema(description = "账单日期")
    private LocalDate billDate;

    /**
     * 支付方式
     */
    @TableField("payment_method")
    @Schema(description = "支付方式")
    private PaymentMethodEnum paymentMethod;

    /**
     * 备注
     */
    @TableField("remark")
    @Schema(description = "备注")
    private String remark;

}
