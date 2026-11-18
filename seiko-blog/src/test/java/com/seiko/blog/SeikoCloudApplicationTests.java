package com.seiko.blog;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * 基础测试类
 */
@SpringBootTest
@EnabledIfSystemProperty(named = "blog.integration.tests", matches = "true")
class SeikoCloudApplicationTests {

    @Test
    void contextLoads() {
        System.out.println("Spring Boot 上下文加载成功！");
    }

}
