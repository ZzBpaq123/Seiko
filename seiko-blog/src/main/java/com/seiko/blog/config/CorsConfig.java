package com.seiko.blog.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;

/**
 * 跨域配置
 * <p>
 * 使用 FilterRegistrationBean 注册并设置最高优先级，确保 CORS 过滤器在 Sa-Token 等过滤器之前执行，
 * 避免 OPTIONS 预检请求被其他过滤器提前拦截而导致跨域失败。
 */
@Configuration
public class CorsConfig {

    @Bean
    public FilterRegistrationBean<CorsFilter> corsFilter(
            @Value("${blog.cors.allowed-origins:http://localhost:3001,http://localhost:3002}") String allowedOrigins) {
        CorsConfiguration config = new CorsConfiguration();
        // 博客前台和管理端来源；部署时通过 BLOG_CORS_ALLOWED_ORIGINS 配置
        config.setAllowedOrigins(Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList());
        // 允许所有请求头
        config.addAllowedHeader("*");
        // 允许所有请求方法
        config.addAllowedMethod("*");
        // 允许携带凭证
        config.setAllowCredentials(true);
        // 暴露响应头（Sa-Token 的 Token 会放在响应头中）
        config.addExposedHeader("token");

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        FilterRegistrationBean<CorsFilter> bean = new FilterRegistrationBean<>(new CorsFilter(source));
        // 最高优先级，确保最先处理 CORS 预检请求
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return bean;
    }

}
