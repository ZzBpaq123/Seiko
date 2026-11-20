package com.seiko.blog.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.env.MockEnvironment;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BlogConfigurationTest {

    @Test
    void baseConfigurationUsesSeparatePortAndDisablesDocumentation() throws IOException {
        MockEnvironment env = configuration();
        assertEquals("seiko-blog-service", env.getProperty("spring.application.name"));
        assertEquals("1002", env.getProperty("server.port"));
        assertNull(env.getProperty("spring.profiles.active"));
        assertEquals("false", env.getProperty("springdoc.api-docs.enabled"));
        assertEquals("false", env.getProperty("springdoc.swagger-ui.enabled"));
        assertEquals("./uploads", env.getProperty("blog.upload.path"));
        assertEquals("http://localhost:3001", env.getProperty("blog.cors.allowed-origins"));
    }

    @Test
    void profilesUseDedicatedRedisAndEnvironmentCredentials() throws IOException {
        for (String profile : new String[]{"dev", "prod"}) {
            MockEnvironment env = configuration("application-" + profile + ".yml");
            env.setProperty("MYSQL_PASSWORD", "test-password");
            assertEquals("test-password", env.getProperty("spring.datasource.password"));
            assertEquals("10", env.getProperty("spring.data.redis.database"));
            assertEquals("", env.getProperty("spring.data.redis.password"));
            assertTrue(env.getProperty("spring.datasource.url").startsWith("jdbc:mysql://localhost:3306/seiko_blog?"));
            assertEquals(String.valueOf(profile.equals("dev")), env.getProperty("springdoc.api-docs.enabled"));
        }
    }

    @Test
    void deploymentCanOverridePortDatabaseUploadAndCors() throws IOException {
        MockEnvironment env = configuration("application-prod.yml");
        env.setProperty("BLOG_SERVER_PORT", "2002");
        env.setProperty("BLOG_REDIS_DATABASE", "11");
        env.setProperty("BLOG_MYSQL_DATABASE", "custom_blog");
        env.setProperty("BLOG_UPLOAD_PATH", "D:/blog/uploads");
        env.setProperty("BLOG_CORS_ALLOWED_ORIGINS", "https://blog.example,https://manage.example");
        assertEquals("2002", env.getProperty("server.port"));
        assertEquals("11", env.getProperty("spring.data.redis.database"));
        assertTrue(env.getProperty("spring.datasource.url").contains("/custom_blog?"));
        assertEquals("D:/blog/uploads", env.getProperty("blog.upload.path"));
        assertEquals("https://blog.example,https://manage.example", env.getProperty("blog.cors.allowed-origins"));
        assertFalse(env.getProperty("springdoc.swagger-ui.enabled", Boolean.class));
    }

    private MockEnvironment configuration(String... profiles) throws IOException {
        MockEnvironment env = new MockEnvironment();
        add(env, "application.yml");
        for (String file : profiles) {
            add(env, file);
        }
        return env;
    }

    private void add(MockEnvironment env, String file) throws IOException {
        for (PropertySource<?> source : new YamlPropertySourceLoader().load(file, new ClassPathResource(file))) {
            env.getPropertySources().addFirst(source);
        }
    }
}
