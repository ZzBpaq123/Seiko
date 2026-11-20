# Seiko Blog Service

博客公开后端，默认端口 1002，提供原有 /api/blog/** 接口（文章、相册、评论、公告、书影音、足迹、资源和邮箱验证码），并负责文章阅读量定时回写。管理接口已移至 [seiko-manage-service](../seiko-manage-service/README.md)。

## 服务边界与共享数据

| 项目 | 博客服务 | 管理服务 | 工作台服务 |
|------|----------|----------|------------|
| Maven 模块 | seiko-blog-service | seiko-manage-service | seiko-work-service |
| 默认端口 | 1002 | 1003 | 1001 |
| MySQL 数据库 | seiko_blog | seiko_blog | seiko_work |
| Redis 库 | 10 | 10 | 2（开发环境） |

博客与管理服务分别依赖 seiko-common，不互相依赖。共享的实体、DTO、VO 和枚举位于 seiko-common/src/main/java/com/seiko/blog/，保留原包名，以兼容现有 Redis 缓存中的类型信息。控制器、业务服务、Mapper 和运行配置分别位于各自模块中。

两个服务必须连接同一博客数据库和 Redis 实例/库，使管理端修改内容后可以失效公开端缓存；通过 BLOG_MYSQL_DATABASE、BLOG_REDIS_DATABASE 统一配置。工作台继续使用独立的数据源和 Redis 库。博客服务不加载管理控制器、登录鉴权或管理日志任务。

## 数据库与上传文件

需要 JDK 21+、Maven 3.9+、MySQL 8 和 Redis 7。已有 seiko_blog 数据库直接复用，无需重建。仓库根目录 sql/seiko_blog.sql 包含业务数据及 DROP TABLE 语句，仅用于确认可以覆盖的新库。新库先创建并选择数据库，再导入：

    CREATE DATABASE seiko_blog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    USE seiko_blog;
    SOURCE D:/Project/Seiko/sql/seiko_blog.sql;

两个服务均通过 /uploads/** 提供静态文件访问；管理服务负责上传。分别启动时，应将两个进程的 BLOG_UPLOAD_PATH 设置为同一个绝对目录（例如 D:/blog/uploads），或挂载同一个共享存储目录，确保旧的 1002 上传链接和新的 1003 上传链接均能访问文件。默认 ./uploads 相对于各自的启动工作目录解析，工作目录不同时不能保证共享。此次拆分没有连接或修改数据库，也没有迁移上传文件。

## 开发与构建

在终端中设置 MYSQL_PASSWORD；Redis 有密码时设置 REDIS_PASSWORD。邮箱验证码还需要 MAIL_USERNAME 和 MAIL_PASSWORD（SMTP 授权码）。Maven 不会自动加载 .env 文件。从仓库根目录执行：

    mvn -pl seiko-blog-service,seiko-manage-service -am clean install

分别在两个终端启动（每个终端均需配置上述环境变量和相同的 BLOG_UPLOAD_PATH）：

    mvn -pl seiko-blog-service spring-boot:run "-Dspring-boot.run.profiles=dev"
    mvn -pl seiko-manage-service spring-boot:run "-Dspring-boot.run.profiles=dev"

install 将父 POM 和 seiko-common 安装到本地 Maven 仓库，供后续单独启动使用。博客 Swagger UI：http://localhost:1002/swagger-ui.html；管理 Swagger UI：http://localhost:1003/swagger-ui.html。默认不激活 dev，非开发环境关闭 API 文档。

仅测试、打包而不安装：

    mvn -pl seiko-blog-service,seiko-manage-service -am clean package

生产启动：

    java -jar seiko-blog-service/target/seiko-blog-service-1.0.0.jar --spring.profiles.active=prod

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| BLOG_SERVER_PORT | 博客服务端口 | 1002 |
| MYSQL_HOST / MYSQL_PORT | MySQL 地址 | localhost / 3306 |
| BLOG_MYSQL_DATABASE | 两服务共享的博客数据库 | seiko_blog |
| MYSQL_USERNAME | 数据库用户 | root |
| MYSQL_PASSWORD | 数据库密码 | 必填 |
| REDIS_HOST / REDIS_PORT | 两服务共享的 Redis 地址 | localhost / 6379 |
| BLOG_REDIS_DATABASE | 两服务共享的 Redis 库 | 10 |
| REDIS_PASSWORD | Redis 密码 | 空 |
| MAIL_USERNAME / MAIL_PASSWORD | 发件账号 / SMTP 授权码 | 空 |
| BLOG_UPLOAD_PATH | 两服务共享的上传目录，建议绝对路径 | ./uploads |
| BLOG_CORS_ALLOWED_ORIGINS | 博客前台来源，以逗号分隔 | http://localhost:3001 |

博客配置前缀为 blog.*。可通过 Spring 标准 SPRING_DATASOURCE_*、SPRING_DATA_REDIS_* 环境变量覆盖连接配置，但两服务的博客数据连接需保持一致。本机配置可写入被 Git 忽略的 src/main/resources/application-local.yml，并显式启用 dev,local；启动日志隐藏数据库、Redis 和邮件密码。

博客前台保持 http://localhost:1002/api/blog。管理前台需使用 http://localhost:1003/api，已有 .env.local 请同步调整并重启前台。

## 测试

默认测试不需要 MySQL 或 Redis：

    mvn -pl seiko-blog-service,seiko-manage-service -am test

应用上下文集成测试仅在显式开启后运行，需要专用测试数据源：

    mvn -pl seiko-blog-service -am test "-Dblog.integration.tests=true" "-Dspring.profiles.active=dev"

管理服务的集成测试使用 -Dmanage.integration.tests=true。不要连接生产数据库；博客服务包含定时阅读量回写任务。
