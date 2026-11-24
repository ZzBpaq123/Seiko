package com.seiko.work.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.seiko.common.result.ResultCode;
import com.seiko.work.dto.BillDTO;
import com.seiko.work.entity.Bill;
import com.seiko.work.enums.BillStatPeriodEnum;
import com.seiko.work.enums.BillTypeEnum;
import com.seiko.common.exception.BusinessException;
import com.seiko.work.mapper.BillMapper;
import com.seiko.work.service.BillService;
import com.seiko.work.vo.BillCategoryStatVO;
import com.seiko.work.vo.BillOverviewVO;
import com.seiko.work.vo.BillSummaryVO;
import com.seiko.work.vo.BillTrendVO;
import com.seiko.work.vo.BillVO;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

/**
 * 账单明细 Service 实现
 * <p>
 * 统计全部走实时聚合，不维护预聚合表：个人记账数据量小，
 * 实时结果永远与明细一致，也省掉了增删改时同步统计表的维护成本与对账风险。
 */
@Service
public class BillServiceImpl extends ServiceImpl<BillMapper, Bill> implements BillService {

    @Override
    public Page<BillVO> pageBills(Long userId, long current, long size, Integer type, String category,
                                  LocalDate startDate, LocalDate endDate) {
        validateRange(startDate, endDate);
        LambdaQueryWrapper<Bill> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Bill::getUserId, userId);
        if (type != null) {
            wrapper.eq(Bill::getType, parseType(type));
        }
        if (StringUtils.hasText(category)) {
            wrapper.eq(Bill::getCategory, category);
        }
        if (startDate != null) {
            wrapper.ge(Bill::getBillDate, startDate);
        }
        if (endDate != null) {
            wrapper.le(Bill::getBillDate, endDate);
        }
        // 同一天可能有多笔，再用 id 兜底保证分页顺序稳定
        wrapper.orderByDesc(Bill::getBillDate).orderByDesc(Bill::getId);

        Page<Bill> page = page(new Page<>(current, size), wrapper);
        Page<BillVO> voPage = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        voPage.setRecords(page.getRecords().stream().map(BillVO::from).toList());
        return voPage;
    }

    @Override
    public BillVO getOwned(Long id, Long userId) {
        return BillVO.from(requireOwned(id, userId));
    }

    @Override
    public void createBill(Long userId, BillDTO dto) {
        Bill bill = new Bill();
        BeanUtils.copyProperties(dto, bill);
        bill.setUserId(userId);
        save(bill);
    }

    @Override
    public void updateBill(Long id, Long userId, BillDTO dto) {
        Bill bill = requireOwned(id, userId);
        // 仅更新非空字段，避免 DTO 缺省字段覆盖数据库原值
        if (dto.getCategory() != null) {
            bill.setCategory(dto.getCategory());
        }
        if (dto.getType() != null) {
            bill.setType(dto.getType());
        }
        if (dto.getAmount() != null) {
            bill.setAmount(dto.getAmount());
        }
        if (dto.getBillDate() != null) {
            bill.setBillDate(dto.getBillDate());
        }
        if (dto.getPaymentMethod() != null) {
            bill.setPaymentMethod(dto.getPaymentMethod());
        }
        if (dto.getRemark() != null) {
            bill.setRemark(dto.getRemark());
        }
        updateById(bill);
    }

    @Override
    public void deleteBill(Long id, Long userId) {
        requireOwned(id, userId);
        removeById(id);
    }

    @Override
    public BillSummaryVO summary(Long userId, LocalDate startDate, LocalDate endDate) {
        LocalDate[] range = resolveRange(startDate, endDate);
        return summaryOf(userId, range[0], range[1]);
    }

    @Override
    public BillOverviewVO overview(Long userId) {
        LocalDate today = LocalDate.now();
        // 周口径与 BillStatPeriodEnum.WEEK 一致：ISO 周，周一为一周第一天
        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDate yearStart = today.withDayOfYear(1);

        BillOverviewVO vo = new BillOverviewVO();
        vo.setToday(summaryOf(userId, today, today));
        vo.setWeek(summaryOf(userId, weekStart, weekStart.plusDays(6)));
        vo.setMonth(summaryOf(userId, monthStart, monthStart.plusMonths(1).minusDays(1)));
        vo.setYear(summaryOf(userId, yearStart, yearStart.plusYears(1).minusDays(1)));
        return vo;
    }

    @Override
    public List<BillTrendVO> trend(Long userId, LocalDate startDate, LocalDate endDate, BillStatPeriodEnum period) {
        BillStatPeriodEnum actualPeriod = period != null ? period : BillStatPeriodEnum.DAY;
        LocalDate[] defaults = defaultRange(actualPeriod);
        LocalDate start = startDate != null ? startDate : defaults[0];
        LocalDate end = endDate != null ? endDate : defaults[1];
        validateRange(start, end);
        return baseMapper.trend(userId, start, end.plusDays(1), actualPeriod.name());
    }

    @Override
    public List<BillCategoryStatVO> categoryStat(Long userId, LocalDate startDate, LocalDate endDate) {
        LocalDate[] range = resolveRange(startDate, endDate);
        List<BillCategoryStatVO> list = baseMapper.categoryStat(userId, range[0], range[1].plusDays(1));
        BigDecimal totalExpense = list.stream()
                .map(BillCategoryStatVO::getExpense)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        list.forEach(item -> item.setExpensePercent(percent(item.getExpense(), totalExpense)));
        return list;
    }

    /**
     * 汇总单次查询，start / end 均为闭区间
     */
    private BillSummaryVO summaryOf(Long userId, LocalDate start, LocalDate end) {
        BillSummaryVO vo = baseMapper.summary(userId, start, end.plusDays(1));
        if (vo == null) {
            // 聚合查询理论上必返回一行，这里仅作防御
            vo = new BillSummaryVO();
            vo.setIncome(BigDecimal.ZERO);
            vo.setExpense(BigDecimal.ZERO);
            vo.setBalance(BigDecimal.ZERO);
            vo.setBillCount(0L);
        }
        vo.setStartDate(start);
        vo.setEndDate(end);
        return vo;
    }

    /**
     * 汇总 / 分类统计的默认区间：起始缺省为「本月 1 号」，结束缺省为「今天」
     */
    private LocalDate[] resolveRange(LocalDate startDate, LocalDate endDate) {
        LocalDate today = LocalDate.now();
        LocalDate start = startDate != null ? startDate : today.withDayOfMonth(1);
        LocalDate end = endDate != null ? endDate : today;
        validateRange(start, end);
        return new LocalDate[]{start, end};
    }

    /**
     * 趋势统计的默认区间：按粒度各给一段便于直接出图的区间
     */
    private LocalDate[] defaultRange(BillStatPeriodEnum period) {
        LocalDate today = LocalDate.now();
        return switch (period) {
            case DAY -> new LocalDate[]{today.minusDays(29), today};
            case WEEK -> {
                LocalDate monday = today.with(DayOfWeek.MONDAY);
                yield new LocalDate[]{monday.minusWeeks(11), monday.plusDays(6)};
            }
            case MONTH -> {
                LocalDate firstOfMonth = today.withDayOfMonth(1);
                yield new LocalDate[]{firstOfMonth.minusMonths(11), firstOfMonth.plusMonths(1).minusDays(1)};
            }
            case YEAR -> {
                LocalDate firstOfYear = today.withDayOfYear(1);
                yield new LocalDate[]{firstOfYear.minusYears(4), firstOfYear.plusYears(1).minusDays(1)};
            }
        };
    }

    /**
     * 占比计算：总数为 0 时直接返回 0.00，避免除零异常
     */
    private BigDecimal percent(BigDecimal part, BigDecimal total) {
        if (part == null || total == null || total.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return part.multiply(BigDecimal.valueOf(100)).divide(total, 2, RoundingMode.HALF_UP);
    }

    private BillTypeEnum parseType(Integer type) {
        BillTypeEnum typeEnum = BillTypeEnum.of(type);
        if (typeEnum == null) {
            throw new BusinessException(ResultCode.PARAM_ERROR.getCode(), "账单类型只能是 0（支出）或 1（收入）");
        }
        return typeEnum;
    }

    private void validateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new BusinessException(ResultCode.PARAM_ERROR.getCode(), "起始日期不能晚于结束日期");
        }
    }

    private Bill requireOwned(Long id, Long userId) {
        Bill bill = getById(id);
        if (bill == null || !bill.getUserId().equals(userId)) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        return bill;
    }

}
