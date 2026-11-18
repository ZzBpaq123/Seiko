# Seiko Blog 后端

从 D:\Project\seiko-web 迁入的博客后端，依赖同仓库的 seiko-common。提供公开博客 API（/api/blog/**）和后台管理 API（/api/manage/**），保留原有业务代码和接口路径。

## 服务与数据

| 项目 | 博客 | 工作台 |
|------|------|--------|
| 后端模块 | seiko-blog | seiko-work-service |
| 默认端口 | 1002 | 1001 |
| MySQL 数据库 | seiko_blog | seiko_work |
| Redis 库 | 10 | 2（开发环境） |

博客前台开发端口为 3001，管理前台为 3003。两个前台的 API 默认值已指向博客后端 1002；已有 .env.local 如配置了旧端口，需要同步修改并重新启动前台。生产部署也应给两个后端分配不同 Redis 库，避免同名会话和验证码键冲突。

## 数据库与上传文件

需要 JDK 21+、Maven 3.9+、MySQL 8 和 Redis 7。

已有 seiko_blog 数据库可以直接复用，不需要重建或导入。仓库根目录 sql/seiko_blog.sql 保留原有版本，含业务数据和 DROP TABLE 语句，仅适用于确认可覆盖的新库；导入前自行创建并选择 seiko_blog 数据库，例如在 MySQL 客户端对新库执行：

    CREATE DATABASE seiko_blog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    USE seiko_blog;
    SOURCE D:/Project/Seiko/sql/seiko_blog.sql;

本次迁移没有连接或修改实际数据库，也没有复制上传目录。复用旧上传文件时，设置 BLOG_UPLOAD_PATH 指向原目录（例如 D:/blog/uploads），原 /uploads/** 访问路径保持不变。未配置时使用启动工作目录下的 ./uploads；新上传文件不纳入 Git。

## 开发与构建

在运行 Maven 的终端中设置 MYSQL_PASSWORD；Redis 开启认证时同时设置 REDIS_PASSWORD。邮件验证码需要配置 MAIL_USERNAME 和 MAIL_PASSWORD（SMTP 授权码）。Maven 不会自动加载 .env 文件。

以下命令从仓库根目录执行：

    mvn -pl seiko-blog -am clean install
    mvn -pl seiko-blog spring-boot:run "-Dspring-boot.run.profiles=dev"

先执行 install，使父 POM 和 seiko-common 可供单独启动博客模块使用。开发环境 Swagger UI：http://localhost:1002/swagger-ui.html。

仅测试和打包、不安装到本地 Maven 仓库：

    mvn -pl seiko-blog -am clean package

可执行包为 seiko-blog/target/seiko-blog-1.0.0.jar，生产启动：

    java -jar seiko-blog/target/seiko-blog-1.0.0.jar --spring.profiles.active=prod

默认不激活 dev，API 文档仅在 dev 开启。也可以通过 Spring 标准 SPRING_DATASOURCE_*、SPRING_DATA_REDIS_* 环境变量覆盖连接配置。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| BLOG_SERVER_PORT | 博客后端端口 | 1002 |
| MYSQL_HOST / MYSQL_PORT | MySQL 地址 | localhost / 3306 |
| BLOG_MYSQL_DATABASE | 博客数据库名 | seiko_blog |
| MYSQL_USERNAME | 数据库用户 | root |
| MYSQL_PASSWORD | 数据库密码 | 必填 |
| REDIS_HOST / REDIS_PORT | Redis 地址 | localhost / 6379 |
| BLOG_REDIS_DATABASE | 博客 Redis 库 | 10 |
| REDIS_PASSWORD | Redis 密码 | 空 |
| MAIL_USERNAME / MAIL_PASSWORD | 发件账号 / SMTP 授权码 | 空 |
| BLOG_UPLOAD_PATH | 已有或新上传文件的存储目录 | ./uploads |
| BLOG_CORS_ALLOWED_ORIGINS | 允许的前台来源，以逗号分隔 | http://localhost:3001,http://localhost:3003 |

实际密码和原本机配置未迁入。需要本地配置文件时，可使用已被 Git 忽略的 src/main/resources/application-local.yml，并显式启用 dev,local；部署时应使用环境变量提供凭据。启动配置日志中的数据库、Redis 和邮件密码均隐藏。

## 测试

默认测试不要求 MySQL 或 Redis，包括原登录限流测试，以及迁移后的配置、跨域白名单和日志隐藏密码测试：

    mvn -pl seiko-blog -am test

原应用上下文测试需要专用测试数据库和 Redis，显式开启后才运行：

    mvn -pl seiko-blog -am test "-Dblog.integration.tests=true" "-Dspring.profiles.active=dev"

不要将上下文集成测试连接到生产数据库；服务包含定时阅读量回写和日志任务。
