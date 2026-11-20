package com.seiko.manage.config;

import com.seiko.common.config.StartupConfigPrinter;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@ExtendWith(OutputCaptureExtension.class)
class StartupConfigPrinterTest {

    @Test
    void neverPrintsDatabaseRedisOrMailPasswords(CapturedOutput output) {
        MockEnvironment env = new MockEnvironment()
                .withProperty("spring.datasource.password", "database-secret-value")
                .withProperty("spring.data.redis.password", "redis-secret-value")
                .withProperty("spring.mail.password", "mail-secret-value");

        new StartupConfigPrinter(env).run(new DefaultApplicationArguments());

        assertFalse(output.getAll().contains("database-secret-value"));
        assertFalse(output.getAll().contains("redis-secret-value"));
        assertFalse(output.getAll().contains("mail-secret-value"));
        assertTrue(output.getAll().contains("******"));
    }
}
