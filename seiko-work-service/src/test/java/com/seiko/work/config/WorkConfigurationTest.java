package com.seiko.work.config;

import com.zaxxer.hikari.HikariDataSource;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;

class WorkConfigurationTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner(() -> {
        var context = new AnnotationConfigApplicationContext();
        context.setEnvironment(new MockEnvironment());
        return context;
    }).withInitializer(new ConfigDataApplicationContextInitializer())
            .withConfiguration(AutoConfigurations.of(DataSourceAutoConfiguration.class));

    @Test
    void usesWorkDatabaseAndRedisDefaultsWhenNoProfileIsSelected() {
        runner.withPropertyValues("MYSQL_PASSWORD=test-password").run(context -> {
            var database = context.getBean(HikariDataSource.class);
            var environment = context.getEnvironment();

            assertThat(environment.getActiveProfiles()).containsExactly("dev");
            assertThat(database.getJdbcUrl()).startsWith("jdbc:mysql://localhost:3306/seiko_work?");
            assertThat(database.getUsername()).isEqualTo("root");
            assertThat(database.getPassword()).isEqualTo("test-password");
            assertThat(environment.getProperty("spring.data.redis.database", Integer.class)).isEqualTo(2);
            assertThat(environment.getProperty("spring.data.redis.password")).isEmpty();
            assertThat(environment.getProperty("server.port", Integer.class)).isEqualTo(1001);
        });
    }

    @Test
    void overridesDatabaseRedisAndServerSettings() {
        runner.withPropertyValues("MYSQL_HOST=db.example.test", "MYSQL_PORT=3307",
                "WORK_MYSQL_DATABASE=work_test", "MYSQL_USERNAME=work_user", "MYSQL_PASSWORD=test-password",
                "REDIS_HOST=redis.example.test", "REDIS_PORT=6380", "WORK_REDIS_DATABASE=3",
                "REDIS_PASSWORD=test-redis-password", "WORK_SERVER_PORT=2001").run(context -> {
            var database = context.getBean(HikariDataSource.class);
            var environment = context.getEnvironment();

            assertThat(database.getJdbcUrl()).startsWith("jdbc:mysql://db.example.test:3307/work_test?");
            assertThat(database.getUsername()).isEqualTo("work_user");
            assertThat(database.getPassword()).isEqualTo("test-password");
            assertThat(environment.getProperty("spring.data.redis.host")).isEqualTo("redis.example.test");
            assertThat(environment.getProperty("spring.data.redis.port", Integer.class)).isEqualTo(6380);
            assertThat(environment.getProperty("spring.data.redis.database", Integer.class)).isEqualTo(3);
            assertThat(environment.getProperty("spring.data.redis.password")).isEqualTo("test-redis-password");
            assertThat(environment.getProperty("server.port", Integer.class)).isEqualTo(2001);
        });
    }
}
