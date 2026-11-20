package com.seiko.blog;

import com.seiko.common.config.CorsConfig;
import com.seiko.common.config.MyBatisPlusConfig;
import com.seiko.common.config.RedisCacheConfig;
import com.seiko.common.config.StartupConfigPrinter;
import org.springframework.context.annotation.Import;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Seiko Blog 个人博客启动类
 *
 * @author Seiko
 */
@SpringBootApplication
@Import({CorsConfig.class, MyBatisPlusConfig.class, RedisCacheConfig.class, StartupConfigPrinter.class})
@EnableScheduling
@MapperScan("com.seiko.blog.mapper")
public class SeikoBlogApplication {

    public static void main(String[] args) {
        SpringApplication.run(SeikoBlogApplication.class, args);
        System.out.println("""
                 ____       _ _           ____  _            \s
                / ___|  ___(_) | _____   | __ )| | ___   __ _\s
                \\___ \\ / _ \\ | |/ / _ \\  |  _ \\| |/ _ \\ / _` |
                 ___) |  __/ |   < (_) | | |_) | | (_) | (_| |
                |____/ \\___|_|_|\\_\\___/  |____/|_|\\___/ \\__, |
                                                        |___/\s
                """);
    }

}
