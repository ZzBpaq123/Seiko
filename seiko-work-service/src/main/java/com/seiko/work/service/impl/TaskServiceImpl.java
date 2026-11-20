package com.seiko.work.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.seiko.common.result.ResultCode;
import com.seiko.work.dto.TaskDTO;
import com.seiko.work.entity.Task;
import com.seiko.work.enums.TaskStatusEnum;
import com.seiko.common.exception.BusinessException;
import com.seiko.work.mapper.TaskMapper;
import com.seiko.work.service.TaskService;
import com.seiko.work.vo.TaskVO;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

/**
 * 工作事项 Service 实现
 */
@Service
public class TaskServiceImpl extends ServiceImpl<TaskMapper, Task> implements TaskService {

    @Override
    public Page<TaskVO> pageTasks(Long userId, long current, long size) {
        LambdaQueryWrapper<Task> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Task::getUserId, userId)
                .orderByDesc(Task::getPriority)
                .orderByAsc(Task::getPlanDate);
        Page<Task> page = page(new Page<>(current, size), wrapper);
        Page<TaskVO> voPage = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        voPage.setRecords(page.getRecords().stream().map(TaskVO::from).toList());
        return voPage;
    }

    @Override
    public List<TaskVO> listToday(Long userId) {
        LocalDate today = LocalDate.now();
        LambdaQueryWrapper<Task> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Task::getUserId, userId)
                .and(w -> w.le(Task::getPlanDate, today)
                        .ne(Task::getStatus, TaskStatusEnum.DONE))
                .orderByAsc(Task::getPlanDate)
                .orderByDesc(Task::getPriority);
        return baseMapper.selectList(wrapper).stream().map(TaskVO::from).toList();
    }

    @Override
    public TaskVO getOwned(Long id, Long userId) {
        return TaskVO.from(requireOwned(id, userId));
    }

    @Override
    public void createTask(Long userId, TaskDTO dto) {
        Task task = new Task();
        BeanUtils.copyProperties(dto, task);
        task.setUserId(userId);
        save(task);
    }

    @Override
    public void updateTask(Long id, Long userId, TaskDTO dto) {
        Task task = requireOwned(id, userId);
        // 仅更新非空字段，避免 DTO 缺省字段覆盖数据库原值
        if (dto.getTitle() != null) {
            task.setTitle(dto.getTitle());
        }
        if (dto.getContent() != null) {
            task.setContent(dto.getContent());
        }
        if (dto.getPlanDate() != null) {
            task.setPlanDate(dto.getPlanDate());
        }
        if (dto.getStatus() != null) {
            task.setStatus(dto.getStatus());
        }
        if (dto.getPriority() != null) {
            task.setPriority(dto.getPriority());
        }
        updateById(task);
    }

    @Override
    public void deleteTask(Long id, Long userId) {
        requireOwned(id, userId);
        removeById(id);
    }

    private Task requireOwned(Long id, Long userId) {
        Task task = getById(id);
        if (task == null || !task.getUserId().equals(userId)) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        return task;
    }

}
