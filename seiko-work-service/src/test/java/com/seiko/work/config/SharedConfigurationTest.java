package com.seiko.work.config;

import cn.dev33.satoken.SaManager;
import cn.dev33.satoken.spring.SaTokenContextForSpringInJakartaServlet;
import cn.dev33.satoken.spring.json.SaJsonTemplateForJackson;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import com.seiko.common.config.CorsConfig;
import com.seiko.common.config.MyBatisPlusConfig;
import com.seiko.common.exception.BusinessException;
import com.seiko.common.result.ResultCode;
import com.seiko.work.common.GlobalExceptionHandler;
import com.seiko.work.controller.HolidayController;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.filter.RequestContextFilter;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SharedConfigurationTest {
    @Test
    void workKeepsPageLimitPreflightAndReturnsErrorsInTheResponseBody() {
        new ApplicationContextRunner()
                .withInitializer(new ConfigDataApplicationContextInitializer())
                .withPropertyValues("seiko.cors.allowed-origins=https://*.example.org")
                .withUserConfiguration(CorsConfig.class, MyBatisPlusConfig.class)
                .run(context -> {
                    var pagination = (PaginationInnerInterceptor) context.getBean(MybatisPlusInterceptor.class)
                            .getInterceptors().getFirst();
                    assertThat(pagination.getMaxLimit()).isEqualTo(100L);

                    var cors = (CorsFilter) context.getBean("corsFilter", FilterRegistrationBean.class).getFilter();
                    var controller = new HolidayController(year -> {
                        throw new BusinessException(ResultCode.VERIFICATION_CODE_TOO_FREQUENT);
                    });
                    var mvc = MockMvcBuilders.standaloneSetup(controller)
                            .setControllerAdvice(new GlobalExceptionHandler()).addFilters(cors).build();
                    mvc.perform(options("/api/holidays/2026")
                                    .header("Origin", "https://work.example.org")
                                    .header("Access-Control-Request-Method", "GET"))
                            .andExpect(status().isOk())
                            .andExpect(header().string("Access-Control-Allow-Origin", "https://work.example.org"))
                            .andExpect(header().string("Access-Control-Max-Age", "1800"));
                    mvc.perform(get("/api/holidays/2026"))
                            .andExpect(status().isOk())
                            .andExpect(jsonPath("$.code").value(1008));
                    mvc.perform(get("/api/holidays/invalid"))
                            .andExpect(status().isOk())
                            .andExpect(jsonPath("$.code").value(400));
                    mvc.perform(post("/api/holidays/2026"))
                            .andExpect(status().isOk())
                            .andExpect(jsonPath("$.code").value(405));
                });
    }

    @Test
    void authenticationFilterReturnsHttp200WithUnauthorizedCode() throws Exception {
        var previousContext = SaManager.getSaTokenContext();
        try {
            SaManager.setSaTokenContext(new SaTokenContextForSpringInJakartaServlet());
            var filter = new SaTokenConfig().saServletFilter(new SaJsonTemplateForJackson());
            var mvc = MockMvcBuilders.standaloneSetup(new HolidayController(year -> List.of()))
                    .addFilters(new RequestContextFilter(), filter)
                    .build();

            mvc.perform(get("/api/holidays/2026"))
                    .andExpect(status().isOk())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.code").value(401))
                    .andExpect(jsonPath("$.message").value(ResultCode.UNAUTHORIZED.getMessage()));
        } finally {
            SaManager.setSaTokenContext(previousContext);
        }
    }
}
