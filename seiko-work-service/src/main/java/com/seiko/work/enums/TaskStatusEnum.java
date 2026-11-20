package com.seiko.work.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import com.fasterxml.jackson.annotation.JsonValue;
import com.seiko.common.enums.BaseEnum;
import lombok.Getter;

/**
 * 工作事项状态枚举
 */
@Getter
public enum TaskStatusEnum implements BaseEnum<Integer> {

    /**
     * 待办
     */
    PENDING(0, "待办"),

    /**
     * 进行中
     */
    IN_PROGRESS(1, "进行中"),

    /**
     * 已完成
     */
    DONE(2, "已完成");

    @EnumValue
    @JsonValue
    private final Integer value;
    private final String description;

    TaskStatusEnum(Integer value, String description) {
        this.value = value;
        this.description = description;
    }

}
