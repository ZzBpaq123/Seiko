package com.seiko.work.config;

import cn.dev33.satoken.context.SaHolder;
import cn.dev33.satoken.exception.NotLoginException;
import cn.dev33.satoken.filter.SaServletFilter;
import cn.dev33.satoken.interceptor.SaInterceptor;
import cn.dev33.satoken.json.SaJsonTemplate;
import cn.dev33.satoken.stp.StpUtil;
import com.seiko.common.result.Result;
import com.seiko.common.result.ResultCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Sa-Token 权限认证配置
 * <p>
 * 基于 SaRouter 路由匹配实现接口权限控制：
 */
@Slf4j
@Configuration
public class SaTokenConfig implements WebMvcConfigurer {

    /**
     * 注册 Sa-Token 注解拦截器，使 @SaCheckLogin 等注解生效
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new SaInterceptor()).addPathPatterns("/**");
    }

    /**
     * 注册 Sa-Token 全局过滤器
     */
    @Bean
    public SaServletFilter saServletFilter(SaJsonTemplate jsonTemplate) {
        return new SaServletFilter()
                // 指定拦截路由
                .addInclude("/**")
                // 指定放行路由（静态资源 & Swagger & 上传文件 & 认证公开接口）
                // /auth/** 下的登录、注册、验证码接口精确放行，其余接口（修改密码、资料、登出等）默认要求登录
                .addExclude("/favicon.ico", "/doc.html", "/webjars/**", "/swagger-resources/**", "/v3/api-docs/**",
                        "/swagger-ui/**", "/swagger-ui.html",
                        "/auth/email/code", "/auth/email/register", "/auth/email/login",
                        "/auth/phone/code", "/auth/phone/register", "/auth/phone/login",
                        "/auth/password/code", "/auth/password/reset")
                // 认证函数：基于路径和方法做权限校验
                .setAuth(obj -> {
                    // 5. 其余接口默认需要登录
                    StpUtil.checkLogin();
                })
                .setError(e -> {
                    ResultCode code = ResultCode.UNAUTHORIZED;
                    if (!(e instanceof NotLoginException)) {
                        log.error("认证过滤器异常", e);
                        code = ResultCode.ERROR;
                    }
                    SaHolder.getResponse().setHeader("Content-Type", "application/json;charset=UTF-8");
                    return jsonTemplate.toJsonString(Result.error(code));
                });
    }

}
