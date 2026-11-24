package com.seiko.work.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.seiko.common.result.ResultCode;
import com.seiko.work.dto.SavingsBucketDTO;
import com.seiko.work.dto.SavingsGoalDTO;
import com.seiko.work.entity.SavingsGoal;
import com.seiko.common.exception.BusinessException;
import com.seiko.work.mapper.SavingsGoalMapper;
import com.seiko.work.service.SavingsGoalService;
import com.seiko.work.vo.SavingsBucketVO;
import com.seiko.work.vo.SavingsGoalVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * 攒钱目标 Service 实现
 * <p>
 * 档位列表以 JSON 存在单列里，读写时在这里与实体字段互转。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SavingsGoalServiceImpl extends ServiceImpl<SavingsGoalMapper, SavingsGoal>
        implements SavingsGoalService {

    /** 各档位比例合计必须等于该值 */
    private static final int TOTAL_PERCENT = 100;

    private static final String DEFAULT_NAME = "每月工资分配";

    private final ObjectMapper objectMapper;

    @Override
    public SavingsGoalVO getByUserId(Long userId) {
        SavingsGoal goal = getOne(new LambdaQueryWrapper<SavingsGoal>()
                .eq(SavingsGoal::getUserId, userId));
        if (goal == null) {
            return null;
        }
        SavingsGoalVO vo = new SavingsGoalVO();
        BeanUtils.copyProperties(goal, vo);
        vo.setBuckets(readBuckets(goal.getBuckets()));
        return vo;
    }

    @Override
    public void saveGoal(Long userId, SavingsGoalDTO dto) {
        validate(dto);
        SavingsGoal goal = getOne(new LambdaQueryWrapper<SavingsGoal>()
                .eq(SavingsGoal::getUserId, userId));
        boolean isNew = goal == null;
        if (isNew) {
            goal = new SavingsGoal();
            goal.setUserId(userId);
        }
        goal.setName(StringUtils.hasText(dto.getName()) ? dto.getName().trim() : DEFAULT_NAME);
        goal.setBuckets(writeBuckets(dto.getBuckets()));
        // 整体覆盖：发薪日必填（DTO 层 @NotNull 兜底），这里直接写入
        goal.setSalaryDay(dto.getSalaryDay());
        if (isNew) {
            save(goal);
        } else {
            updateById(goal);
        }
    }

    /**
     * 校验比例合计：必须恰好 100%，否则「非储蓄预算」这类测算会失真
     */
    private void validate(SavingsGoalDTO dto) {
        int sum = dto.getBuckets().stream()
                .mapToInt(bucket -> bucket.getPercent() == null ? 0 : bucket.getPercent())
                .sum();
        if (sum != TOTAL_PERCENT) {
            throw new BusinessException(ResultCode.PARAM_ERROR.getCode(),
                    "各档位比例合计必须为 100%，当前为 " + sum + "%");
        }
    }

    private String writeBuckets(List<SavingsBucketDTO> buckets) {
        try {
            return objectMapper.writeValueAsString(buckets);
        } catch (JsonProcessingException e) {
            log.error("攒钱目标档位序列化失败", e);
            throw new BusinessException("攒钱目标保存失败");
        }
    }

    /**
     * 反序列化档位；历史数据损坏时返回空列表，不因为一条脏数据让整个接口 500
     */
    private List<SavingsBucketVO> readBuckets(String json) {
        if (!StringUtils.hasText(json)) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<SavingsBucketVO>>() {
            });
        } catch (JsonProcessingException e) {
            log.warn("攒钱目标档位解析失败，已按空列表处理: {}", json, e);
            return List.of();
        }
    }

}
