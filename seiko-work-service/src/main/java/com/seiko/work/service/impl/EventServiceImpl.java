package com.seiko.work.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.seiko.common.result.ResultCode;
import com.seiko.work.dto.EventDTO;
import com.seiko.work.entity.Event;
import com.seiko.common.exception.BusinessException;
import com.seiko.work.mapper.EventMapper;
import com.seiko.work.service.EventService;
import com.seiko.work.vo.EventVO;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;

/**
 * 日程事件 Service 实现
 */
@Service
public class EventServiceImpl extends ServiceImpl<EventMapper, Event> implements EventService {

    @Override
    public Page<EventVO> pageEvents(Long userId, long current, long size) {
        LambdaQueryWrapper<Event> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Event::getUserId, userId)
                .orderByDesc(Event::getStartTime);
        Page<Event> page = page(new Page<>(current, size), wrapper);
        Page<EventVO> voPage = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        voPage.setRecords(page.getRecords().stream().map(EventVO::from).toList());
        return voPage;
    }

    @Override
    public List<EventVO> listByTimeRange(Long userId, Date startTime, Date endTime) {
        if (!endTime.after(startTime)) {
            throw new BusinessException(ResultCode.PARAM_ERROR.getCode(), "结束时间必须晚于开始时间");
        }
        LambdaQueryWrapper<Event> wrapper = new LambdaQueryWrapper<>();
        // end_time 为 NULL 的事件用 start_time 兜底：start_time < end AND COALESCE(end_time, start_time) > start
        wrapper.eq(Event::getUserId, userId)
                .lt(Event::getStartTime, endTime)
                .and(w -> w.gt(Event::getEndTime, startTime)
                        .or()
                        .isNull(Event::getEndTime).ge(Event::getStartTime, startTime))
                .orderByAsc(Event::getStartTime);
        return baseMapper.selectList(wrapper).stream().map(EventVO::from).toList();
    }

    @Override
    public EventVO getOwned(Long id, Long userId) {
        return EventVO.from(requireOwned(id, userId));
    }

    @Override
    public void createEvent(Long userId, EventDTO dto) {
        Event event = new Event();
        BeanUtils.copyProperties(dto, event);
        event.setUserId(userId);
        save(event);
    }

    @Override
    public void updateEvent(Long id, Long userId, EventDTO dto) {
        Event event = requireOwned(id, userId);
        // 仅更新非空字段，避免 DTO 缺省字段覆盖数据库原值
        if (dto.getTitle() != null) {
            event.setTitle(dto.getTitle());
        }
        if (dto.getStartTime() != null) {
            event.setStartTime(dto.getStartTime());
        }
        if (dto.getEndTime() != null) {
            event.setEndTime(dto.getEndTime());
        }
        if (dto.getIsAllDay() != null) {
            event.setIsAllDay(dto.getIsAllDay());
        }
        if (dto.getLocation() != null) {
            event.setLocation(dto.getLocation());
        }
        if (dto.getContent() != null) {
            event.setContent(dto.getContent());
        }
        updateById(event);
    }

    @Override
    public void deleteEvent(Long id, Long userId) {
        requireOwned(id, userId);
        removeById(id);
    }

    private Event requireOwned(Long id, Long userId) {
        Event event = getById(id);
        if (event == null || !event.getUserId().equals(userId)) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        return event;
    }

}
