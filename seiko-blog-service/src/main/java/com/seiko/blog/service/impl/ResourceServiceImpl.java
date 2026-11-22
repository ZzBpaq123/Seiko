package com.seiko.blog.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.seiko.common.constant.RedisConstant;
import com.seiko.blog.entity.Resource;
import com.seiko.blog.mapper.ResourceMapper;
import com.seiko.blog.service.ResourceService;
import com.seiko.blog.vo.ResourceGroupVO;
import com.seiko.blog.vo.ResourceVO;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 资源服务实现
 */
@Service
@RequiredArgsConstructor
public class ResourceServiceImpl implements ResourceService {

    private final ResourceMapper resourceMapper;

    /** 无分类资源的默认分组名称 */
    private static final String UNCATEGORIZED = "未分类";

    @Override
    @Cacheable(cacheNames = RedisConstant.CACHE_RESOURCE, key = "'groups'")
    public List<ResourceGroupVO> getEnabledResourceGroups() {
        List<Resource> resources = resourceMapper.selectList(
                new LambdaQueryWrapper<Resource>()
                        .eq(Resource::getEnabled, true)
                        .orderByAsc(Resource::getSortOrder)
                        .orderByDesc(Resource::getId)
        );

        // 按分类聚合，保持查询的排序顺序（LinkedHashMap）
        Map<String, ResourceGroupVO> groupMap = new LinkedHashMap<>();
        for (Resource resource : resources) {
            String category = (resource.getCategory() == null || resource.getCategory().isBlank())
                    ? UNCATEGORIZED
                    : resource.getCategory();
            ResourceGroupVO group = groupMap.computeIfAbsent(category, key -> {
                ResourceGroupVO vo = new ResourceGroupVO();
                vo.setCategory(key);
                vo.setResources(new ArrayList<>());
                return vo;
            });
            group.getResources().add(convertToVO(resource));
        }

        return new ArrayList<>(groupMap.values());
    }

    private ResourceVO convertToVO(Resource resource) {
        if (resource == null) {
            return null;
        }
        ResourceVO vo = new ResourceVO();
        vo.setId(resource.getId());
        vo.setResourceName(resource.getResourceName());
        vo.setResourceUrl(resource.getResourceUrl());
        vo.setCategory(resource.getCategory());
        vo.setDescription(resource.getDescription());
        vo.setSortOrder(resource.getSortOrder());
        vo.setEnabled(resource.getEnabled());
        vo.setCreateTime(resource.getCreateTime());
        return vo;
    }
}
