# Seiko Work

面向个人的工作站：接收邮件、安排每日工作与日程、记录每日收支。

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Spring Boot 3.4 + Java 21 + MyBatis-Plus 3.5 + MySQL 8 + Redis |
| 认证 | Sa-Token 1.39（UUID Token，会话存 Redis） |
| 邮件 | Jakarta Mail（IMAP 实时拉取，不入库） |
| 前端 | Next.js 15 + React 19 + TypeScript + Tailwind CSS 4 + axios |
| 文档 | springdoc-openapi 2.8（Swagger UI） |

## 项目结构

```
seiko-work-service/   # 后端（Maven，端口 1001）
seiko-work-ui/        # 前端（Next.js，开发端口 3000）
doc/                  # 项目文档
```

## 快速开始

### 环境要求

- JDK 21+、Maven 3.9+、MySQL 8.x、Redis 7.x、Node.js 18+

### 1. 初始化数据库

```bash
mysql -u root -p < seiko-work-service/src/main/resources/db/schema.sql
```

创建 6 张表：`work_user`（用户）、`work_mail`（邮箱授权配置）、`work_task`（工作事项）、`work_event`（日程事件）、`work_bill`（账单明细）、`work_savings_goal`（攒钱目标）。

### 2. 配置环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `MYSQL_PASSWORD` | MySQL 密码 | 必填，无默认值 |
| `REDIS_PASSWORD` | Redis 密码 | 空（实例要求认证时必填） |
| `CRYPTO_KEY` | 敏感字段 AES-256-GCM 密钥，至少 32 字符，使用随机生成值 | 必填，无默认值 |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | 发件邮箱账号 / SMTP 授权码 | 空 |
| `CORS_ALLOWED_ORIGINS` | 允许跨域来源 | `http://localhost:3000` |
| `NEXT_PUBLIC_API_BASE_URL` | 前端请求的后端地址 | `http://localhost:1001` |

### 3. 启动后端

```bash
cd seiko-work-service
mvn spring-boot:run "-Dspring-boot.run.profiles=dev"
```

开发环境接口文档：http://localhost:1001/swagger-ui.html。默认不激活开发环境，非开发环境关闭 API 文档；生产环境需通过环境变量或部署配置提供数据源和 Redis 连接配置（例如 `SPRING_DATASOURCE_URL`、`SPRING_DATASOURCE_USERNAME`、`SPRING_DATASOURCE_PASSWORD` 和 `SPRING_DATA_REDIS_*`），不要使用 dev 配置。

### 4. 启动前端

```bash
cd seiko-work-ui
npm install
npm run dev
```

访问 http://localhost:3000

## 常用命令

```bash
# 后端
mvn test                                    # 运行测试
mvn test -Dtest=CryptoUtilTest              # 运行单个测试
mvn clean package -DskipTests               # 打包 -> target/seiko-work-service.jar

# 前端
npm run dev / build / lint
```

## API 概览

统一返回格式 `{ "code": 200, "message": "...", "data": {...} }`，`code == 200` 表示成功。认证方式为请求头携带 `token: <uuid>`（登录接口返回）。

| 模块 | 路径 | 说明 |
|------|------|------|
| 认证 | `POST /auth/email/code` `/auth/email/register` `/auth/email/login` | 邮箱验证码 / 注册 / 登录 |
| 认证 | `POST /auth/phone/code` `/auth/phone/register` `/auth/phone/login` | 手机验证码（仅 dev 使用 Mock；非 dev 未配置供应商时发送失败） |
| 认证 | `POST /auth/password/code` `/auth/password/reset` `/auth/password/change` | 找回密码 / 修改密码 |
| 认证 | `GET /auth/info`、`PUT /auth/profile`、`POST /auth/logout` | 当前用户 / 改资料 / 登出 |
| 任务 | `GET/POST /api/tasks`、`GET /api/tasks/today`、`PUT/DELETE /api/tasks/{id}` | 工作事项 CRUD、今日工作 |
| 日程 | `GET/POST /api/events`、`GET /api/events/range`、`PUT/DELETE /api/events/{id}` | 日程 CRUD、时间范围查询 |
| 邮件 | `GET/POST /api/mails/account`、`GET /api/mails/account/providers` | 邮箱授权配置（自动识别服务商） |
| 邮件 | `GET /api/mails`、`GET /api/mails/{uid}`、`POST /api/mails/{uid}/read` | IMAP 实时拉取列表 / 详情 / 标记已读 |
| 节假日 | `GET /api/holidays/{year}` | 法定节假日（服务端代理第三方 API，Redis 缓存 3 天） |
| 账单 | `GET/POST /api/bills`、`GET/PUT/DELETE /api/bills/{id}` | 账单明细 CRUD、分页筛选 |
| 账单 | `GET /api/bills/overview` | 今日 / 本周 / 本月 / 本年四段汇总（一次拿全） |
| 账单 | `GET /api/bills/summary` | 任意周期汇总：收入 / 支出 / 结余 / 笔数 |
| 账单 | `GET /api/bills/trend` | 趋势统计，`?period=DAY\|WEEK\|MONTH\|YEAR` |
| 账单 | `GET /api/bills/category-stat` | 分类维度统计（含支出占比） |
| 攒钱目标 | `GET /api/savings-goal`、`PUT /api/savings-goal` | 每月收入分配目标 + 发薪日（一个用户一条配置，未配置时 `data` 为 `null`） |

注意：`/auth/**` 无前缀，其余业务接口均为 `/api` 前缀。登录、注册、找回密码验证码接口公开；绑定联系方式必须登录。

## 安全修复后的接口与升级说明

- 邮箱注册使用 `POST /auth/email/code`；手机验证码发送使用 `POST /auth/phone/code`，`purpose` 为 `LOGIN`（默认）或 `REGISTER`。找回密码必须使用 `POST /auth/password/code`。
- 绑定新邮箱、手机号分别使用 `POST /auth/email/bind-code`、`POST /auth/phone/bind-code`，请求体仍为 `{email}` 或 `{phone}`，并携带登录 Token。验证码同时绑定当前用户。
- 验证码不跨用途使用，连续输错 5 次即失效；校验成功立即消费，即使后续数据库操作失败也不恢复，需重新获取。旧版本验证码不再生效。
- 发送前原子预占接收方冷却与 IP 小时配额；发送失败释放本次冷却，但保留 IP 次数，防止利用失败供应商反复调用。延迟过久的发送不会覆盖新预占。
- 修改或重置密码在事务提交后撤销既有会话，用户需重新登录。错误响应保留 Result 格式，同时返回对应 HTTP 状态。
- IMAP 仅允许 `MailProviderEnum` 中列出的服务商地址、993 端口和 SSL；保存时和每次连接前都会检查，历史自定义配置也受限制。新增企业邮箱需先由维护者审查并加入服务商列表。
- 模拟短信仅用于 dev，会在日志中打印开发验证码；正式环境需提供真实 `SmsService` Bean，否则发送明确失败。

### 历史邮箱授权码的密钥迁移

已有数据库不能直接更换 CRYPTO_KEY，否则原授权码无法解密。若旧环境使用默认密钥或较短密钥，应先备份数据库并停止所有应用实例，然后使用离线工具迁移。工具不打印授权码和密钥，默认只验证并回滚；任意一条密文不匹配旧密钥都会导致整批回滚。

通过安全方式设置环境变量 `OLD_CRYPTO_KEY`（旧环境实际密钥）、`CRYPTO_KEY`（新的至少 32 字符随机密钥）、`ROTATION_JDBC_URL`、`MYSQL_USERNAME`、`MYSQL_PASSWORD`。在后端目录运行，驱动路径替换为本机 Maven 缓存中的 mysql-connector-j JAR：

```text
java --class-path "<mysql-connector-j-8.0.33.jar 的完整路径>" tools/RotateMailKey.java
java --class-path "<mysql-connector-j-8.0.33.jar 的完整路径>" tools/RotateMailKey.java --apply
```

确认迁移成功后，所有应用实例使用同一个新 CRYPTO_KEY 启动，再清理临时的 OLD_CRYPTO_KEY。工具仅处理现有 AES-GCM 密文，早期明文授权码应走单独的数据修复流程。本次代码修复不会自动修改实际数据库。

### 验证

```bash
mvn test
# 本地 Redis 集成测试：仅操作随机命名的测试键，不清空数据库
# 实例需要认证时，先设置 VERIFICATION_REDIS_PASSWORD
mvn test "-Dverification.redis.tests=true"
java tools/RotateMailKey.java --self-test
```

## 账单模块（记账）

### 表设计

单表 `work_bill`，一条记录 = 一笔消费/收入。`category` 为自由文本（不建分类字典表），前端提供常用分类快捷标签，同时允许手动输入。

几个刻意的取舍：

- **金额用 `DECIMAL(12,2)`，不用 FLOAT/DOUBLE**。浮点累加会出现 `0.1 + 0.2 = 0.30000000000000004`，账目上不可接受。
- **金额恒为正数，收/支方向由 `type` 区分**（0-支出，1-收入），统计时用 `CASE WHEN` 换算正负。比"支出存负数"更直观，也避免漏加负号把统计正负搞反。
- **日/周/月/年四种粒度全部落在 `bill_date` 一个字段上**，查询统一写成 `[起始日, 结束日次日)` 的半开区间，直接命中 `idx_user_date`。因此既不需要生成列，也不需要预聚合统计表——个人记账一年几千行，实时聚合结果永远与明细一致，还省掉了增删改时同步统计表的维护成本和对账风险。
- **周口径按 ISO 标准：周一为一周第一天**。分组键取"该周的周一"（`DATE_SUB(bill_date, INTERVAL WEEKDAY(bill_date) DAY)`），而不是 `YEARWEEK()` 返回的 `202641` 这类数字，前端展示和排序都更省事。Java 侧对应 `today.with(DayOfWeek.MONDAY)`，两侧必须一致，否则"本周"会差一天。
- 索引：`idx_user_date`（日/周/月/年主查询）、`idx_user_type_date`（收支分开统计）、`idx_user_category_date`。

### 接口约定

- **日期区间在 API 边界是闭区间**（`startDate` / `endDate` 均含当天），与前端筛选习惯一致；转成 SQL 用的半开区间由 Service 层内部完成。
- **`type` 作为查询参数用 `Integer` 而不是枚举**：`@JsonValue` 只作用于 Jackson，查询参数走的是 Spring 的 `StringToEnumConverterFactory`（按枚举名匹配），传 `?type=0` 会转换失败。请求体（新增/修改）里仍然是枚举，Jackson 能正常按 `@JsonValue` 反序列化。
- **金额校验放在 DTO 层**（`@DecimalMin("0.01")` + `@Digits(integer = 10, fraction = 2)`，与 `DECIMAL(12,2)` 对齐），沿用项目"无 CHECK 约束、校验在 Service/DTO"的风格。
- 趋势统计用一条 SQL 承载：`CASE #{period} WHEN 'DAY'/'WEEK'/'MONTH'/'YEAR'` 生成 `periodLabel` / `periodStart` / `periodEnd` 再分组。`periodLabel` 的字典序与时间序一致（`2026-10-12` / `2026-10` / `2026`），可直接作为图表 X 轴。
- 统计类查询（`SUM` / `GROUP BY`）无法用 Lambda Wrapper 表达，改用 Mapper 上的 `@Select` 注解承载，与项目"不写 XML Mapper"的约定一致。

### 攒钱目标

账单页左上角的「攒钱目标」按钮会弹出配置弹窗，把每月收入按比例分到若干档位，默认是**储蓄 70% / 日常开销 20% / 心愿 10%**。

- 档位数量、名称都由用户自定义（1–10 个），`percent` 为整数百分比，服务端校验**各档合计必须等于 100**。
- 弹窗是**两栏布局**：左栏填配置（名称、发薪日、档位），右栏实时展示测算结果（各档金额、储蓄合计、非储蓄预算、已支出、剩余/超支），测算数据不再占左栏底部。弹窗宽度从 30rem 放宽到 52rem（另有 `max-w-[94vw]` 兜底），左右栏 `1fr` / `19rem`。
- 右栏卡片用 `h-full` 撑满左栏撑出来的行高（`flex flex-col` + 汇总块 `mt-auto`），所以高度始终和左栏对齐、多出来的空间落在档位明细与汇总之间，而不会出现「卡片只有半截高、下面空一片」。
- 两栏用**容器查询**（`@container` + `@[48rem]:`）切换：窗口约窄于 800px、弹窗被压到 48rem 内容宽度以下时自动堆成一栏，避免两栏被压扁。阈值特意比弹窗宽度（52rem）低一档——容器查询量的是**内容盒**，而全局 `box-sizing: border-box` 下 1px 边框会让内容盒比 52rem 小一点点，阈值若卡在 52rem 上就永远不生效。
- 每个档位可标记为「储蓄档」；**非储蓄档的金额合计就是本周期可用预算**，弹窗里拿它和周期实际支出对比，直接给出「剩余 / 超支」。
- **发薪日 `salaryDay` 必填，取值 1–31，默认 1 号**（`work_savings_goal.salary_day` 是 `NOT NULL DEFAULT 1`，DTO 层用 `@NotNull` + `@Min(1)/@Max(31)` 校验）：弹窗据此把「本月」换成**发薪周期**——起点是最近一次发薪日（今天还没到发薪日就取上个月那次），终点是今天，因为工资到账后才谈得上「本轮可分配的钱」。31 号遇到小月自动落到月末（2 月就是 28/29 号），不会溢到下个月 3 号。1 号的周期（本月 1 日至今）与自然月完全等价，所以默认值不改变任何测算结果。
- 发薪日**不允许留空，但弹窗里不写任何发薪日的错误文案**：清空或填 1–31 之外的值时，只有「边框标红 + 保存按钮不可点」这两个信号；失焦会把非法值（含空值）补回 1 号，合法值顺手规范化（如 `05` → `5`）。约束由前端按钮和 DTO 层的 `@NotNull / @Min / @Max` 共同兜住，不走弹窗提示。比例合计不是 100% 或档位名为空时，保存按钮同样不可点。
- 改发薪日会**立刻按新周期重取收支**（输入过程防抖 250ms），不必等保存；保存接口是整体覆盖（实体上 `salary_day` 用 `FieldStrategy.ALWAYS` 显式写出，避免 MyBatis-Plus 默认的 `NOT_NULL` 策略在值为 null 时静默跳过更新）。
- 发薪周期只作用于这个弹窗的测算口径；账单面板的日/周/月/年筛选仍是自然周期。
- 存储上，一个用户一条记录（`work_savings_goal`，`uk_user_id`），档位用 **JSON 数组存在单列**里：档位只有几行、永远整组读写、也不会按档位做条件查询，拆子表只会徒增 join。读写时在 Service 层用 Jackson 与档位列表互转，JSON 解析失败按空列表处理，不让一条脏数据把接口打成 500。
- 前端金额测算是实时计算的：改比例、改名称、改发薪日都会立刻重算，不必等保存。

### 相关文件

```
后端
  entity/Bill.java  SavingsGoal.java
  dto/BillDTO.java  SavingsGoalDTO.java  SavingsBucketDTO.java
  vo/BillVO.java  BillSummaryVO.java  BillOverviewVO.java  BillTrendVO.java  BillCategoryStatVO.java
  vo/SavingsGoalVO.java  SavingsBucketVO.java
  enums/BillTypeEnum.java  PaymentMethodEnum.java  BillStatPeriodEnum.java
  mapper/BillMapper.java  SavingsGoalMapper.java
  service/BillService.java + service/impl/BillServiceImpl.java
  service/SavingsGoalService.java + service/impl/SavingsGoalServiceImpl.java
  controller/BillController.java  SavingsGoalController.java

前端
  lib/bill.ts               # 账单 API 封装与类型定义
  lib/savings.ts            # 攒钱目标 API 与默认档位
  lib/date.ts               # 日期/金额格式化（账单相关组件共用）
  components/BillPanel.tsx           # 记账面板
  components/SavingsGoalDialog.tsx   # 攒钱目标弹窗
```

## 前端说明

单页应用，采用 **hash 路由**（非 Next.js 文件路由）：`#` 首页、`#mail` 邮箱、`#schedule` 日程、`#bill` 记账、`#login` 登录。页面以 Panel 组件形式挂载在 `app/page.tsx`，导航入口在 `components/SideNav.tsx`。API 调用统一走 `lib/axios.ts`（自动附带 token、统一错误处理与登录过期跳转）。

### 邮件详情正文渲染

邮件正文来自外部发件人，属于不可信内容，**任何以 HTML 形式渲染前都必须先清洗**。`lib/mailHtml.ts` 负责这件事：

- `sanitizeEmailHtml()`：用 `DOMParser` 解析后移除 `script` / `style` / `iframe` / `form` 等标签、HTML 注释、`on*` 事件属性、`srcdoc` / `formaction`；对 `href` / `src` 做协议白名单（拦截 `javascript:` / `vbscript:` / `file:`，`data:` 仅放行 `data:image/`）；所有 `<a>` 强制加 `target="_blank" rel="noopener noreferrer nofollow"`，使正文里的链接可以在新标签页打开。
- `textToHtml()`：纯文本正文路径，先解码 HTML 实体再转义（顺序不能反），自动识别裸链接，换行转 `<br>`。
- `buildMailBodyHtml()`：优先用 HTML 正文，清洗后若为空（例如整封都是 script/style）自动回退纯文本。

配套样式在 `app/globals.css` 的 `.mail-html` 下：约束图片/表格宽度避免撑破面板，深色主题下强制正文 `color: inherit` 并让背景透明，防止邮件自带的黑字白底在深色面板里变成不可读。

### 记账面板

`components/BillPanel.tsx`，左侧统计 + 右侧明细：

- 周期在 `日 / 周 / 月 / 年` 之间切换，可前后翻页或跳回今天。
- **周期窗口在前端计算**（`periodRange` / `trendWindow`），显式把 `startDate` / `endDate` 传给后端，不依赖后端默认值。趋势图的窗口是"以当前周期为终点往前推"（日看近 30 天、周看近 12 周、月看近 12 个月、年看近 5 年），保证翻到任意周期都有一段可比的历史。
- 汇总卡片（支出/收入/结余/笔数）、收支双柱趋势图、支出分类占比条。**图表用 div 绘制，未引入图表库**。
- 明细按日期分组（带"今天 / 昨天"标记与当日支出小计），分页用"加载更多"。
- 左上角「攒钱目标」按钮弹出分配配置弹窗，见上一节的[攒钱目标](#攒钱目标)。
- 日期解析一律手写 `parseDate`（`new Date(y, m-1, d)`），不用 `new Date("2026-10-12")`——后者按 UTC 解析，在东八区会差一天。

### 前端性能优化与验证

业务面板首次访问时加载，空闲及导航悬停时预加载代码；访问后保留挂载，表单、搜索与面板出入场动画不变。登录状态检查仍在首页初始化。GET 仅合并同一用户的相同在途请求，不缓存已完成的业务数据；写操作会使合并记录失效，各调用方可独立取消。邮件、日程、账单查询只接收最新请求结果。

日历缓存日期与泳道索引及网格 JSX；背景复用粒子材质，合并窗口缩放重绘，保留粒子数量、DPR、旋转速度、动画时长和缓动。

在 `seiko-work-ui` 中运行 `npm test`、`npx tsc --noEmit` 和 `npm run build`。请求测试覆盖独立取消、过期响应、用户隔离、写后失效与失败重试；日历测试对照旧算法验证随机数据、跨月、泳道和溢出数量。

浏览器隔离预览可先运行 `npm start -- --hostname 127.0.0.1 --port 3002`，再运行 `node tests/preview-fixtures.cjs`，访问 `http://127.0.0.1:3003`。该预览仅使用虚构数据，不连接真实后端或保存业务数据。
