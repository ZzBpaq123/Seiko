package com.seiko.work.enums;

import lombok.Getter;

/**
 * 账单统计粒度枚举
 * <p>
 * 仅用于统计查询的分组粒度，不落库，因此不实现 {@link com.seiko.common.enums.BaseEnum}。
 * 作为查询参数时按枚举名传递（如 {@code period=WEEK}），Spring 默认即可完成转换。
 */
@Getter
public enum BillStatPeriodEnum {

    /**
     * 按天
     */
    DAY("按天"),

    /**
     * 按周（ISO 周，周一为一周第一天）
     */
    WEEK("按周"),

    /**
     * 按月
     */
    MONTH("按月"),

    /**
     * 按年
     */
    YEAR("按年");

    private final String description;

    BillStatPeriodEnum(String description) {
        this.description = description;
    }

}
