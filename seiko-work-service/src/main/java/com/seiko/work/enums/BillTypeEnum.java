package com.seiko.work.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import com.fasterxml.jackson.annotation.JsonValue;
import com.seiko.common.enums.BaseEnum;
import lombok.Getter;

/**
 * 账单类型枚举
 */
@Getter
public enum BillTypeEnum implements BaseEnum<Integer> {

    /**
     * 支出
     */
    EXPENSE(0, "支出"),

    /**
     * 收入
     */
    INCOME(1, "收入");

    @EnumValue
    @JsonValue
    private final Integer value;
    private final String description;

    BillTypeEnum(Integer value, String description) {
        this.value = value;
        this.description = description;
    }

    /**
     * 按 value 反查枚举
     *
     * @param value 枚举值，可为 null
     * @return 匹配的枚举，未匹配或入参为 null 时返回 null
     */
    public static BillTypeEnum of(Integer value) {
        if (value == null) {
            return null;
        }
        for (BillTypeEnum item : values()) {
            if (item.value.equals(value)) {
                return item;
            }
        }
        return null;
    }

}
