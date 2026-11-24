package com.seiko.manage.config;

import org.junit.jupiter.api.Test;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.env.MockEnvironment;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ManageConfigurationTest {

    @Test
    void createsMysqlDataSourceWithoutSelectingAProfile() {
        new ApplicationContextRunner()
                .withInitializer(new ConfigDataApplicationContextInitializer())
                .withConfiguration(AutoConfigurations.of(DataSourceAutoConfiguration.class))
                .withPropertyValues("MYSQL_PASSWORD=test-password", "MYSQL_HOST=db.example.test",
                        "MYSQL_PORT=3307", "BLOG_MYSQL_DATABASE=test_blog")
                .run(context -> {
                    HikariDataSource pool = context.getBean(HikariDataSource.class);
                    assertEquals("com.mysql.cj.jdbc.Driver", pool.getDriverClassName());
                    assertTrue(pool.getJdbcUrl().startsWith("jdbc:mysql://db.example.test:3307/test_blog?"));
                    assertEquals("test-password", pool.getPassword());
                    assertEquals("10", context.getEnvironment().getProperty("spring.data.redis.database"));
                });
    }

    @Test
    void baseConfigurationUsesSeparatePortAndDisablesDocumentation() throws IOException {
        MockEnvironment env = configuration();
        assertEquals("seiko-manage-service", env.getProperty("spring.application.name"));
        assertEquals("1003", env.getProperty("server.port"));
        assertEquals("dev", env.getProperty("spring.profiles.active"));
        assertEquals("false", env.getProperty("springdoc.api-docs.enabled"));
        assertEquals("false", env.getProperty("springdoc.swagger-ui.enabled"));
        assertEquals("./uploads", env.getProperty("manage.upload.path"));
        assertEquals("http://localhost:3003", env.getProperty("manage.cors.allowed-origins"));
    }

    @Test
    void profilesUseSharedBlogRedisAndEnvironmentCredentials() throws IOException {
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
        env.setProperty("MANAGE_SERVER_PORT", "2003");
        env.setProperty("BLOG_REDIS_DATABASE", "11");
        env.setProperty("BLOG_MYSQL_DATABASE", "custom_blog");
        env.setProperty("BLOG_UPLOAD_PATH", "D:/blog/uploads");
        env.setProperty("MANAGE_CORS_ALLOWED_ORIGINS", "https://manage.example");
        assertEquals("2003", env.getProperty("server.port"));
        assertEquals("11", env.getProperty("spring.data.redis.database"));
        assertTrue(env.getProperty("spring.datasource.url").contains("/custom_blog?"));
        assertEquals("D:/blog/uploads", env.getProperty("manage.upload.path"));
        assertEquals("https://manage.example", env.getProperty("manage.cors.allowed-origins"));
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
