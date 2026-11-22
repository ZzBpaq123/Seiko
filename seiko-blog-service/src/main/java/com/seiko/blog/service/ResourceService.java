package com.seiko.blog.service;

import com.seiko.blog.vo.ResourceGroupVO;

import java.util.List;

/**
 * 资源服务接口
 */
public interface ResourceService {

    /**
     * 获取已启用的资源分组列表（按分类聚合，用于前台展示）
     *
     * @return 资源分组列表
     */
    List<ResourceGroupVO> getEnabledResourceGroups();
}
