package com.seiko.blog.service;

import com.seiko.blog.vo.FootprintVO;

import java.util.List;

/**
 * 足迹服务接口
 */
public interface FootprintService {

    /**
     * 获取足迹列表
     *
     * @return 足迹列表
     */
    List<FootprintVO> getFootprintList();

    /**
     * 获取足迹详情
     *
     * @param id 足迹ID
     * @return 足迹详情
     */
    FootprintVO getFootprintById(Long id);

    /**
     * 根据足迹类型获取列表
     *
     * @param type 足迹类型
     * @return 足迹列表
     */
    List<FootprintVO> getFootprintListByType(String type);
}
