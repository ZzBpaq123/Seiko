package com.seiko.blog.vo;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.util.Date;

public record PublicCommentVO(
        Long id,
        String author,
        String commentContent,
        Date commentDate,
        String avatarColor,
        Long postId,
        @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8") Date createTime
) {
    public static PublicCommentVO from(CommentVO comment) {
        return new PublicCommentVO(comment.getId(), comment.getAuthor(), comment.getCommentContent(),
                comment.getCommentDate(), comment.getAvatarColor(), comment.getPostId(), comment.getCreateTime());
    }
}
