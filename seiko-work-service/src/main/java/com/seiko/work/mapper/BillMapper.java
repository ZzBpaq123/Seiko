package com.seiko.work.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.seiko.work.entity.Bill;
import com.seiko.work.vo.BillCategoryStatVO;
import com.seiko.work.vo.BillSummaryVO;
import com.seiko.work.vo.BillTrendVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDate;
import java.util.List;

/**
 * 账单明细 Mapper
 * <p>
 * 明细增删改查走 MyBatis-Plus 的 BaseMapper；
 * SUM / GROUP BY 这类统计查询无法用 Lambda Wrapper 表达，改用 {@code @Select} 注解承载，
 * 与项目「不写 XML Mapper」的约定保持一致。
 * <p>
 * 所有查询的日期区间均为半开区间 [startDate, endDate)，即包含 startDate、不含 endDate，
 * 由 Service 层把「用户传入的结束日」加一天后传进来。
 */
@Mapper
public interface BillMapper extends BaseMapper<Bill> {

    /**
     * 周期汇总：收入、支出、结余、笔数
     *
     * @param userId    用户ID
     * @param startDate 起始日（含）
     * @param endDate   结束日（不含）
     * @return 汇总结果（startDate / endDate 字段由 Service 层回填）
     */
    @Select("SELECT " +
            "IFNULL(SUM(CASE WHEN type = 1 THEN amount ELSE 0 END), 0) AS income, " +
            "IFNULL(SUM(CASE WHEN type = 0 THEN amount ELSE 0 END), 0) AS expense, " +
            "IFNULL(SUM(CASE WHEN type = 1 THEN amount ELSE -amount END), 0) AS balance, " +
            "COUNT(*) AS billCount " +
            "FROM work_bill " +
            "WHERE user_id = #{userId} AND is_deleted = 0 " +
            "AND bill_date >= #{startDate} AND bill_date < #{endDate}")
    BillSummaryVO summary(@Param("userId") Long userId,
                          @Param("startDate") LocalDate startDate,
                          @Param("endDate") LocalDate endDate);

    /**
     * 趋势统计：按天 / 周 / 月 / 年分组
     * <p>
     * 四种粒度用 {@code CASE #{period}} 合并成一条 SQL：
     * <ul>
     *   <li>periodLabel 的字典序与时间序一致（yyyy-MM-dd / yyyy-MM / yyyy），可直接做 X 轴</li>
     *   <li>按周取「该周周一」作为分组键，避免 YEARWEEK 返回 202641 这类不直观的数字</li>
     * </ul>
     *
     * @param userId    用户ID
     * @param startDate 起始日（含）
     * @param endDate   结束日（不含）
     * @param period    统计粒度：DAY / WEEK / MONTH / YEAR
     * @return 按分组升序排列的趋势数据
     */
    @Select("SELECT " +
            "CASE #{period} " +
            "    WHEN 'DAY' THEN DATE_FORMAT(bill_date, '%Y-%m-%d') " +
            "    WHEN 'WEEK' THEN DATE_FORMAT(DATE_SUB(bill_date, INTERVAL WEEKDAY(bill_date) DAY), '%Y-%m-%d') " +
            "    WHEN 'MONTH' THEN DATE_FORMAT(bill_date, '%Y-%m') " +
            "    WHEN 'YEAR' THEN DATE_FORMAT(bill_date, '%Y') " +
            "END AS periodLabel, " +
            "CASE #{period} " +
            "    WHEN 'DAY' THEN bill_date " +
            "    WHEN 'WEEK' THEN DATE_SUB(bill_date, INTERVAL WEEKDAY(bill_date) DAY) " +
            "    WHEN 'MONTH' THEN DATE(DATE_FORMAT(bill_date, '%Y-%m-01')) " +
            "    WHEN 'YEAR' THEN DATE(DATE_FORMAT(bill_date, '%Y-01-01')) " +
            "END AS periodStart, " +
            "CASE #{period} " +
            "    WHEN 'DAY' THEN bill_date " +
            "    WHEN 'WEEK' THEN DATE_ADD(DATE_SUB(bill_date, INTERVAL WEEKDAY(bill_date) DAY), INTERVAL 6 DAY) " +
            "    WHEN 'MONTH' THEN LAST_DAY(bill_date) " +
            "    WHEN 'YEAR' THEN DATE(DATE_FORMAT(bill_date, '%Y-12-31')) " +
            "END AS periodEnd, " +
            "IFNULL(SUM(CASE WHEN type = 0 THEN amount ELSE 0 END), 0) AS expense, " +
            "IFNULL(SUM(CASE WHEN type = 1 THEN amount ELSE 0 END), 0) AS income, " +
            "COUNT(*) AS billCount " +
            "FROM work_bill " +
            "WHERE user_id = #{userId} AND is_deleted = 0 " +
            "AND bill_date >= #{startDate} AND bill_date < #{endDate} " +
            "GROUP BY periodLabel, periodStart, periodEnd " +
            "ORDER BY periodLabel")
    List<BillTrendVO> trend(@Param("userId") Long userId,
                            @Param("startDate") LocalDate startDate,
                            @Param("endDate") LocalDate endDate,
                            @Param("period") String period);

    /**
     * 分类维度统计：某周期内各分类的收支合计
     * <p>
     * category 允许为 NULL，统一兜底成「未分类」，避免前端出现空白项。
     * expensePercent 由 Service 层按「全部支出」计算后填充。
     *
     * @param userId    用户ID
     * @param startDate 起始日（含）
     * @param endDate   结束日（不含）
     * @return 按支出降序排列的分类统计
     */
    @Select("SELECT " +
            "IFNULL(category, '未分类') AS category, " +
            "IFNULL(SUM(CASE WHEN type = 0 THEN amount ELSE 0 END), 0) AS expense, " +
            "IFNULL(SUM(CASE WHEN type = 1 THEN amount ELSE 0 END), 0) AS income, " +
            "COUNT(*) AS billCount " +
            "FROM work_bill " +
            "WHERE user_id = #{userId} AND is_deleted = 0 " +
            "AND bill_date >= #{startDate} AND bill_date < #{endDate} " +
            "GROUP BY IFNULL(category, '未分类') " +
            "ORDER BY expense DESC, income DESC")
    List<BillCategoryStatVO> categoryStat(@Param("userId") Long userId,
                                          @Param("startDate") LocalDate startDate,
                                          @Param("endDate") LocalDate endDate);

}
