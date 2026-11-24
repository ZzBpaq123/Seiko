package com.seiko.blog.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.seiko.common.constant.RedisConstant;
import com.seiko.common.exception.BusinessException;
import com.seiko.common.result.ResultCode;
import com.seiko.blog.entity.Notice;
import com.seiko.blog.mapper.NoticeMapper;
import com.seiko.blog.service.NoticeService;
import com.seiko.blog.vo.NoticeVO;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 公告服务实现
 */
@Service
@RequiredArgsConstructor
public class NoticeServiceImpl implements NoticeService {

    private final NoticeMapper noticeMapper;

    @Override
    @Cacheable(cacheNames = RedisConstant.CACHE_NOTICE, key = "'enabled'")
    public List<NoticeVO> getEnabledNoticeList() {
        return noticeMapper.selectList(
                new LambdaQueryWrapper<Notice>()
                    .eq(Notice::getEnabled, true)
                    .orderByAsc(Notice::getSortOrder)
                    .orderByDesc(Notice::getId)
        ).stream().map(this::convertToVO).collect(Collectors.toList());
    }

    @Override
    @Cacheable(cacheNames = RedisConstant.CACHE_NOTICE, key = "'id:' + #id", unless = "#result == null")
    public NoticeVO getNoticeById(Long id) {
        Notice notice = noticeMapper.selectById(id);
        if (notice == null || notice.getIsDeleted() == 1) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        return convertToVO(notice);
    }

    private NoticeVO convertToVO(Notice notice) {
        if (notice == null) {
            return null;
        }
        NoticeVO vo = new NoticeVO();
        vo.setId(notice.getId());
        vo.setNoticeTitle(notice.getNoticeTitle());
        vo.setNoticeContent(notice.getNoticeContent());
        vo.setNoticeLink(notice.getNoticeLink());
        vo.setSortOrder(notice.getSortOrder());
        vo.setEnabled(notice.getEnabled());
        vo.setCreateTime(notice.getCreateTime());
        return vo;
    }
}
