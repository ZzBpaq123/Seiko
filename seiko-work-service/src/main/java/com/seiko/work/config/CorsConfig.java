package com.seiko.work.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

/**
 * 跨域配置
 * <p>
 * 前端开发服务器（Next.js，默认 3002 端口）跨域访问后端时，
 * 浏览器会先发 OPTIONS 预检请求，未配置 CORS 时 Spring 会直接返回 403 Invalid CORS request。
 * <p>
 * 允许来源通过配置项 {@code seiko.cors.allowed-origins} 按环境维护（逗号分隔），
 * 禁止使用 "*" 通配符与 allowCredentials 同时开启。
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${seiko.cors.allowed-origins:http://localhost:3002}")
    private String allowedOrigins;

    @Bean
    public FilterRegistrationBean<CorsFilter> corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        // 允许来源白名单（按环境配置，禁止通配符 + 携带凭证组合）
        Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .forEach(config::addAllowedOriginPattern);
        // 允许所有请求头
        config.addAllowedHeader("*");
        // 允许所有请求方法
        config.addAllowedMethod("*");
        // 允许携带凭证
        config.setAllowCredentials(true);
        // 预检请求缓存时间（秒）
        config.setMaxAge(1800L);
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
