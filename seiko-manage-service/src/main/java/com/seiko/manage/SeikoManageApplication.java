package com.seiko.manage;

import com.seiko.common.config.CorsConfig;
import com.seiko.common.config.MyBatisPlusConfig;
import com.seiko.common.config.RedisCacheConfig;
import com.seiko.common.config.StartupConfigPrinter;
import org.springframework.context.annotation.Import;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Seiko Manage 博客管理服务启动类
 *
 * @author Seiko
 */
@SpringBootApplication
@Import({CorsConfig.class, MyBatisPlusConfig.class, RedisCacheConfig.class, StartupConfigPrinter.class})
@MapperScan("com.seiko.manage.mapper")
public class SeikoManageApplication {

    public static void main(String[] args) {
        SpringApplication.run(SeikoManageApplication.class, args);
    }

}
