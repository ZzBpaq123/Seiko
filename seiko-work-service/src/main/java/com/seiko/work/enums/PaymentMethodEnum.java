package com.seiko.work.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import com.fasterxml.jackson.annotation.JsonValue;
import com.seiko.common.enums.BaseEnum;
import lombok.Getter;

/**
 * 支付方式枚举
 */
@Getter
public enum PaymentMethodEnum implements BaseEnum<Integer> {

    /**
     * 其他
     */
    OTHER(0, "其他"),

    /**
     * 现金
     */
    CASH(1, "现金"),

    /**
     * 微信
     */
    WECHAT(2, "微信"),

    /**
     * 支付宝
     */
    ALIPAY(3, "支付宝"),

    /**
     * 储蓄卡
     */
    DEBIT_CARD(4, "储蓄卡"),

    /**
     * 信用卡
     */
    CREDIT_CARD(5, "信用卡");

    @EnumValue
    @JsonValue
    private final Integer value;
    private final String description;

    PaymentMethodEnum(Integer value, String description) {
        this.value = value;
        this.description = description;
    }

    /**
     * 按 value 反查枚举
     *
     * @param value 枚举值，可为 null
     * @return 匹配的枚举，未匹配或入参为 null 时返回 null
     */
    public static PaymentMethodEnum of(Integer value) {
        if (value == null) {
            return null;
        }
        for (PaymentMethodEnum item : values()) {
            if (item.value.equals(value)) {
                return item;
            }
        }
        return null;
    }

}
