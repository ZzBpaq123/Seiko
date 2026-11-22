package com.seiko.blog.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.seiko.blog.dto.CommentDTO;
import com.seiko.blog.service.CommentService;
import com.seiko.blog.vo.CommentVO;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CommentControllerTest {

    @Test
    void publicResponsesExcludeEmailFromStoredComments() {
        CommentVO stored = new CommentVO();
        stored.setId(7L);
        stored.setAuthor("读者");
        stored.setUserEmail("reader@example.invalid");
        stored.setCommentContent("评论内容");
        stored.setPostId(13L);
        CommentDTO submitted = new CommentDTO();
        submitted.setUserEmail(stored.getUserEmail());
        CommentService service = mock(CommentService.class);
        when(service.getCommentList()).thenReturn(List.of(stored));
        when(service.getCommentById(7L)).thenReturn(stored);
        when(service.getCommentListByPostId(13L)).thenReturn(List.of(stored));
        when(service.createComment(submitted)).thenReturn(stored);

        CommentController controller = new CommentController(service);
        ObjectMapper mapper = new ObjectMapper();
        List<JsonNode> responses = List.of(
                mapper.valueToTree(controller.getCommentList().getData().getFirst()),
                mapper.valueToTree(controller.getCommentById(7L).getData()),
                mapper.valueToTree(controller.getCommentListByPostId(13L).getData().getFirst()),
                mapper.valueToTree(controller.createComment(submitted).getData())
        );
        for (JsonNode response : responses) {
            assertEquals(7L, response.path("id").asLong());
            assertEquals("读者", response.path("author").asText());
            assertEquals("评论内容", response.path("commentContent").asText());
            assertFalse(response.has("userEmail"));
        }
    }
}
