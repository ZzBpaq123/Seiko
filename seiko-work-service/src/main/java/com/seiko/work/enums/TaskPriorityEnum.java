package com.seiko.work.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import com.fasterxml.jackson.annotation.JsonValue;
import com.seiko.common.enums.BaseEnum;
import lombok.Getter;

/**
 * 工作事项优先级枚举
 */
@Getter
public enum TaskPriorityEnum implements BaseEnum<Integer> {

    /**
     * 低
     */
    LOW(0, "低"),

    /**
     * 中
     */
    MEDIUM(1, "中"),

    /**
     * 高
     */
    HIGH(2, "高");

    @EnumValue
    @JsonValue
    private final Integer value;
    private final String description;

    TaskPriorityEnum(Integer value, String description) {
        this.value = value;
        this.description = description;
    }

}
