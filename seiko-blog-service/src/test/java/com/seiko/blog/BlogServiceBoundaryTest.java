package com.seiko.blog;

import com.seiko.blog.mapper.*;
import com.seiko.blog.task.PostReadCountFlushTask;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.ApplicationContext;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.util.Set;
import java.util.stream.Collectors;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "spring.autoconfigure.exclude="
        + "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,"
        + "com.baomidou.mybatisplus.autoconfigure.MybatisPlusAutoConfiguration,"
        + "org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,"
        + "org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration")
@AutoConfigureMockMvc
@MockBean({AlbumMapper.class, BookMapper.class, CommentMapper.class, FootprintMapper.class,
        MovieMapper.class, NoticeMapper.class, PhotoMapper.class, PostMapper.class,
        PostTagMapper.class, ResourceMapper.class, TagMapper.class,
        RedisConnectionFactory.class, StringRedisTemplate.class})
class BlogServiceBoundaryTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ApplicationContext context;

    @Autowired
    private RequestMappingHandlerMapping mappings;

    @Test
    void validationErrorKeepsHttp200AndBusinessCode() throws Exception {
        mvc.perform(post("/api/blog/code/email/code")
                        .contentType("application/json").content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").value("email: 邮箱不能为空"));
    }

    @Test
    void startsWithOnlyPublicApisAndOwnsReadCountFlush() {
        Set<String> paths = mappings.getHandlerMethods().entrySet().stream()
                .filter(entry -> isBlogController(entry.getValue()))
                .flatMap(entry -> entry.getKey().getPatternValues().stream())
                .collect(Collectors.toSet());

        assertThat(paths).isNotEmpty().allMatch(path -> path.startsWith("/api/blog/"));
        assertThat(paths).contains("/api/blog/posts", "/api/blog/photos", "/api/blog/comments",
                "/api/blog/notice/enabled", "/api/blog/book", "/api/blog/movie",
                "/api/blog/footprints", "/api/blog/resource/groups", "/api/blog/code/email/code");
        assertThat(context.getBeansOfType(PostReadCountFlushTask.class)).hasSize(1);
        assertThat(context.containsBean("operationLogAspect")).isFalse();
        assertThat(context.containsBean("saServletFilter")).isFalse();
    }

    private boolean isBlogController(HandlerMethod handler) {
        return handler.getBeanType().getPackageName().startsWith("com.seiko.blog.controller");
    }
}
