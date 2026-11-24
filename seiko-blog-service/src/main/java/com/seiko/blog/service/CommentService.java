package com.seiko.blog.service;

import com.seiko.blog.dto.CommentDTO;
import com.seiko.blog.vo.CommentVO;

import java.util.List;

/**
 * 评论服务接口
 */
public interface CommentService {

    /**
     * 获取评论列表
     *
     * @return 评论列表
     */
    List<CommentVO> getCommentList();

    /**
     * 获取评论详情
     *
     * @param id 评论ID
     * @return 评论详情
     */
    CommentVO getCommentById(Long id);

    /**
     * 创建评论
     *
     * @param commentDTO 评论信息
     * @return 创建的评论
     */
    CommentVO createComment(CommentDTO commentDTO);

    /**
     * 根据文章ID获取评论列表
     *
     * @param postId 文章ID
     * @return 评论列表
     */
    List<CommentVO> getCommentListByPostId(Long postId);
}
