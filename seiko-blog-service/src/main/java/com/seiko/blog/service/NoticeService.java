package com.seiko.blog.service;

import com.seiko.blog.vo.NoticeVO;

import java.util.List;

/**
 * 公告服务接口
 */
public interface NoticeService {

    /**
     * 获取已启用的公告列表
     *
     * @return 公告列表
     */
    List<NoticeVO> getEnabledNoticeList();

    /**
     * 获取公告详情
     *
     * @param id 公告ID
     * @return 公告详情
     */
    NoticeVO getNoticeById(Long id);
}
