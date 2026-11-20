package com.seiko.manage;

import cn.dev33.satoken.exception.NotRoleException;
import cn.dev33.satoken.stp.StpUtil;
import com.seiko.manage.mapper.*;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.ApplicationContext;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import javax.sql.DataSource;
import java.util.Set;
import java.util.stream.Collectors;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mockStatic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "spring.autoconfigure.exclude="
        + "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,"
        + "com.baomidou.mybatisplus.autoconfigure.MybatisPlusAutoConfiguration,"
        + "org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,"
        + "org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration")
@AutoConfigureMockMvc
@MockBean({AlbumMapper.class, BookMapper.class, CommentMapper.class, DictItemMapper.class,
        DictTypeMapper.class, FootprintMapper.class, LogMapper.class, MovieMapper.class,
        NoticeMapper.class, PhotoMapper.class, PostMapper.class, PostTagMapper.class,
        ResourceMapper.class, TagMapper.class, UserMapper.class, DataSource.class,
        RedisConnectionFactory.class, StringRedisTemplate.class})
class ManageServiceBoundaryTest {

    @Autowired
    private ApplicationContext context;

    @Autowired
    private RequestMappingHandlerMapping mappings;

    @Autowired
    private MockMvc mvc;

    @Test
    void validationErrorKeepsHttp200AndBusinessCode() throws Exception {
        mvc.perform(post("/api/manage/user/login")
                        .contentType("application/json").content("{\"username\":\"test\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").value("password: 密码不能为空"));
    }

    @Test
    void startsWithOnlyManagementApisAndKeepsOperationLogging() {
        Set<String> paths = mappings.getHandlerMethods().entrySet().stream()
                .filter(entry -> entry.getValue().getBeanType().getPackageName()
                        .startsWith("com.seiko.manage.controller"))
                .flatMap(entry -> entry.getKey().getPatternValues().stream())
                .collect(Collectors.toSet());

        assertThat(paths).isNotEmpty().allMatch(path -> path.startsWith("/api/manage/"));
        assertThat(paths).contains("/api/manage/post/list", "/api/manage/user/login",
                "/api/manage/user/register", "/api/manage/user/info",
                "/api/manage/user/forgot-password/reset", "/api/manage/upload/image");
        assertThat(context.containsBean("postReadCountFlushTask")).isFalse();
        assertThat(context.containsBean("operationLogAspect")).isTrue();
        assertThat(context.containsBean("saServletFilter")).isTrue();
    }

    @Test
    void anonymousUsersCanCheckLoginButCannotReadManagementData() throws Exception {
        mvc.perform(get("/api/manage/user/check"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").value(false));

        for (String path : new String[]{"/api/manage/post/list", "/api/manage/user/info"}) {
            mvc.perform(get(path))
                    .andExpect(jsonPath("$.code").value(401));
        }
    }

    @Test
    void managementQueriesRequireAdminRoleEvenAfterLogin() throws Exception {
        try (MockedStatic<StpUtil> stp = mockStatic(StpUtil.class)) {
            stp.when(() -> StpUtil.checkRole("admin")).thenThrow(new NotRoleException("admin"));

            mvc.perform(get("/api/manage/post/list"))
                    .andExpect(jsonPath("$.code").value(401));

            stp.verify(StpUtil::checkLogin);
            stp.verify(() -> StpUtil.checkRole("admin"));
        }
    }
}
