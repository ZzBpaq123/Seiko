package com.seiko.blog.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.seiko.common.constant.RedisConstant;
import com.seiko.blog.entity.Post;
import com.seiko.blog.entity.PostTag;
import com.seiko.blog.entity.Tag;
import com.seiko.blog.mapper.PostMapper;
import com.seiko.blog.mapper.PostTagMapper;
import com.seiko.blog.mapper.TagMapper;
import com.seiko.blog.service.PostService;
import com.seiko.blog.vo.PostVO;
import com.seiko.blog.vo.TagCountVO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 文章服务实现
 */
@Service
@RequiredArgsConstructor
public class PostServiceImpl extends ServiceImpl<PostMapper, Post> implements PostService {

    /** 阅读数增量计数器 key 前缀 */
    public static final String READ_COUNT_PREFIX = "post:read:";

    private final TagMapper tagMapper;

    private final PostTagMapper postTagMapper;

    private final StringRedisTemplate redisTemplate;

    @Override
    @Cacheable(cacheNames = RedisConstant.CACHE_POST,
            key = "'list:' + #page + ':' + #size",
            condition = "#published == true and (#title == null or #title.isBlank()) and (#tag == null or #tag.isBlank())")
    public Page<PostVO> getPostList(long page, long size, Boolean published, String title, String tag) {
        // 分页查询文章，按发布时间倒序
        Page<Post> postPage = new Page<>(page, size);
        LambdaQueryWrapper<Post> wrapper = new LambdaQueryWrapper<>();
        if (published != null) {
            wrapper.eq(Post::getPublished, published);
        }
        if (title != null && !title.isBlank()) {
            wrapper.like(Post::getTitle, title.trim());
        }

        // 根据标签过滤文章
        List<Long> postIds = findPostIdsByTag(tag);
        if (postIds != null) {
            if (postIds.isEmpty()) {
                // 标签不存在或无关联文章，返回空分页
                Page<PostVO> emptyPage = new Page<>();
                BeanUtils.copyProperties(postPage, emptyPage);
                emptyPage.setRecords(List.of());
                return emptyPage;
            }
            wrapper.in(Post::getId, postIds);
        }

        wrapper.orderByDesc(Post::getPublishTime);

        Page<Post> result = this.page(postPage, wrapper);

        // 转换为VO
        List<PostVO> voList = result.getRecords().stream()
                .map(this::convertToVO)
                .collect(Collectors.toList());

        Page<PostVO> voPage = new Page<>();
        BeanUtils.copyProperties(result, voPage);
        voPage.setRecords(voList);

        return voPage;
    }

    /**
     * 根据标签名称查询关联的文章ID列表；tag 为空时返回 null 表示不过滤
     */
    private List<Long> findPostIdsByTag(String tag) {
        if (tag == null || tag.isBlank()) {
            return null;
        }
        String tagName = tag.trim();
        Tag targetTag = tagMapper.selectOne(
                new LambdaQueryWrapper<Tag>().eq(Tag::getName, tagName).last("LIMIT 1"));
        if (targetTag == null) {
            return List.of();
        }
        return postTagMapper.selectList(
                        new LambdaQueryWrapper<PostTag>().eq(PostTag::getTagId, targetTag.getId()))
                .stream()
                .map(PostTag::getPostId)
                .distinct()
                .collect(Collectors.toList());
    }

    @Override
    @Cacheable(cacheNames = RedisConstant.CACHE_POST, key = "'slug:' + #slug", unless = "#result == null")
    public PostVO getPostBySlug(String slug) {
        LambdaQueryWrapper<Post> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Post::getSlug, slug);
        wrapper.eq(Post::getPublished, true);

        Post post = this.getOne(wrapper);
        if (post == null) {
            return null;
        }

        // 阅读数累加已迁移至 Redis 计数 + 定时回刷，此处仅返回基准值
        return convertToVO(post);
    }

    @Override
    public long incrementReadCountAndGet(Long postId, int baseReadNum) {
        Long delta = redisTemplate.opsForValue().increment(READ_COUNT_PREFIX + postId);
        return baseReadNum + (delta == null ? 0L : delta);
    }

    @Override
    public Page<PostVO> getPostsByTag(String tag, long page, long size) {
        // 先获取该标签下的所有文章ID
        Page<PostVO> voPage = new Page<>(page, size);
        // TODO: 通过标签筛选文章（需要联表查询）
        return voPage;
    }

    @Override
    @Cacheable(cacheNames = RedisConstant.CACHE_POST, key = "'tags'")
    public List<String> getAllTags() {
        return tagMapper.selectList(null)
                .stream()
                .map(tag -> tag.getName())
                .distinct()
                .collect(Collectors.toList());
    }

    @Override
    @Cacheable(cacheNames = RedisConstant.CACHE_POST, key = "'tagCounts'")
    public List<TagCountVO> getTagCounts() {
        // 查询已发布文章总数
        LambdaQueryWrapper<Post> totalWrapper = new LambdaQueryWrapper<>();
        totalWrapper.eq(Post::getPublished, true);
        long totalPosts = this.count(totalWrapper);

        List<Map<String, Object>> list = tagMapper.selectTagCounts();
        return list.stream()
                .map(map -> new TagCountVO(
                        (String) map.get("tag"),
                        ((Number) map.get("count")).intValue(),
                        (int) totalPosts
                ))
                .collect(Collectors.toList());
    }

    /**
     * 将 Post 实体转换为 PostVO
     */
    private PostVO convertToVO(Post post) {
        PostVO vo = new PostVO();
        BeanUtils.copyProperties(post, vo);

        // 设置日期为发布时间
        vo.setDate(post.getPublishTime());

        // 查询标签列表
        List<String> tags = tagMapper.selectTagNamesByPostId(post.getId());
        vo.setTags(tags);

        return vo;
    }
}
