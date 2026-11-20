package com.seiko.work;

import com.seiko.common.config.CorsConfig;
import com.seiko.common.config.MyBatisPlusConfig;
import org.springframework.context.annotation.Import;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Seiko Work Service 启动类
 *
 * @author seiko
 */
@SpringBootApplication
@Import({CorsConfig.class, MyBatisPlusConfig.class})
@MapperScan("com.seiko.work.**.mapper")
public class SeikoWorkApplication {

    public static void main(String[] args) {
        SpringApplication.run(SeikoWorkApplication.class, args);
        System.out.println("""
                 ____       _ _          __        __         _   \s
                / ___|  ___(_) | _____   \\ \\      / /__  _ __| | __
                \\___ \\ / _ \\ | |/ / _ \\   \\ \\ /\\ / / _ \\| '__| |/ /
                 ___) |  __/ |   < (_) |   \\ V  V / (_) | |  |   <\s
                |____/ \\___|_|_|\\_\\___/     \\_/\\_/ \\___/|_|  |_|\\_\\

                Seiko Work Service started successfully!
                API docs: http://localhost:1001/swagger-ui.html
                """);
    }
}
