# Seiko Manage Service

博客管理后端，默认端口 1003，提供原有 /api/manage/** 接口，包括登录注册、找回密码、内容管理、上传、统计、系统信息与操作日志。启动类为 com.seiko.manage.SeikoManageApplication。公开博客接口及阅读量定时回写由 [seiko-blog-service](../seiko-blog-service/README.md) 提供。

## 开发与构建

需要 JDK 21+、Maven 3.9+、MySQL 8 和 Redis 7。从仓库根目录执行：

    mvn -pl seiko-manage-service -am clean install
    mvn -pl seiko-manage-service spring-boot:run "-Dspring-boot.run.profiles=dev"

运行前配置 MYSQL_PASSWORD；Redis 开启认证时配置 REDIS_PASSWORD，邮件验证码需要 MAIL_USERNAME 和 MAIL_PASSWORD。Swagger UI：http://localhost:1003/swagger-ui.html，默认仅 dev 环境开启。

仅测试和打包：

    mvn -pl seiko-manage-service -am clean package

生产启动：

    java -jar seiko-manage-service/target/seiko-manage-service-1.0.0.jar --spring.profiles.active=prod

## 与博客服务共享的数据

复用已有 seiko_blog 数据库。必须与博客服务使用相同的 BLOG_MYSQL_DATABASE、Redis 地址与 BLOG_REDIS_DATABASE（默认 10），以使内容写入后的缓存失效对公开端生效。工作台使用独立数据库和 Redis 库。

两个服务的 BLOG_UPLOAD_PATH 应指向同一个绝对目录或共享挂载目录，默认 ./uploads 依赖各自的启动工作目录。管理服务返回当前管理域名下的 /uploads/** 完整上传 URL，并保留该静态资源映射；博客服务也继续提供 /uploads/**，兼容历史文件链接。生产环境使用独立域名时，同步配置博客前台的图片来源。数据库初始化、共享模型与完整环境变量说明见 [博客服务说明](../seiko-blog-service/README.md)。

## 管理服务专有配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| MANAGE_SERVER_PORT | 管理服务端口 | 1003 |
| MANAGE_CORS_ALLOWED_ORIGINS | 管理前台来源，以逗号分隔 | http://localhost:3003 |

本服务的配置前缀为 manage.*，包括 manage.cors、manage.security 和 manage.upload；数据源、Redis、邮件及上传目录仍沿用两服务共享的环境变量。迁移旧的 application-local.yml 时，将 blog.* 配置改为 manage.*。本机配置文件已加入 Git 忽略规则，凭据通过环境变量提供。

管理前台 seiko-manage-ui 的 NEXT_PUBLIC_API_BASE_URL 默认是 http://localhost:1003/api。已有 .env.local 中的旧 1002 地址需手动同步并重启前台。

鉴权保留原行为：登录、注册、登录检查及找回密码公开；登出、当前用户信息需要登录；其余管理接口需要 admin 角色。登录限流、验证码和异步操作日志均保留。管理服务不加载 /api/blog/** 控制器或阅读量回写任务。

## 测试

    mvn -pl seiko-manage-service -am test

默认测试不连接 MySQL 或 Redis。专用环境中的应用上下文测试需显式开启：

    mvn -pl seiko-manage-service -am test "-Dmanage.integration.tests=true" "-Dspring.profiles.active=dev"
