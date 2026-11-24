# 工作软件调研与 Seiko Work 候选模块

调研日期为 2026 年 11 月 23 日。按工作场景选取 23 个国内外代表产品和服务，通过厂商产品资料和帮助文档核对能力。优先级依据是个人能否独立使用、是否解决已提出的问题，以及能否复用 Seiko Work 规划中的待办、日程、工作记录和知识库。这些新增方向供后续逐项讨论。 [现有需求索引](README.md)

## 最值得先讨论的三个方向

| 候选 | 具体场景与首版用法 | 适合放在哪里 |
| --- | --- | --- |
| 交付与版本台账 | 同一份方案改了三次，过两周还要确认客户收到哪一版。每次交付选择文件版本，记录接收人、日期、待反馈或已确认状态，可附发送邮件或反馈原文。文件继续更新时，历史交付仍指向当时的版本。 | 独立的交付记录，引用知识库附件或固定版本链接。适合优先解决交接问题。 |
| 每日工作动态 | 收工时，按时间看到当天完成的待办、登记的交付、新增资料和日程。勾选值得写的事项，加一句结果，就进入当天的工作记录。日程由用户确认实际进展后写入。 | 扩展每日收集页面。现有方案已包含完成的待办，新增价值在于多个来源集中回看、同一事项只选一次。 |
| 工作流程模板 | 每次项目交接都要整理资料、列出未完成项、约接手人确认。将这些步骤和常用资料存为模板，下次手动套用，生成一份可以独立增删和勾选的清单。 | 从待办创建时选择模板。先支持步骤和资料链接，再根据使用情况决定是否增加负责人及相对截止日期。 |

如果先验证一个方向，建议选**交付与版本台账**。拿最近一次真实交付试用，检查能否直接回答「给了谁、发的是哪版、对方确认了吗」。如果每天花时间最多的是回忆工作内容，可优先验证每日工作动态，观察生成一份可用的日报需要手动补几条。

## 市场上有哪些做法

| 工作场景 | 代表产品的做法 | 对 Seiko Work 的启发 |
| --- | --- | --- |
| 切换项目 | Edge 按工作区保存相关标签页，Notion 用关联字段连接不同资料。 [Edge 工作区](https://support.microsoft.com/en-us/edge/getting-started-with-microsoft-edge-workspaces) · [Notion 关联与汇总](https://www.notion.com/en-gb/help/relations-and-rollups) | 在已有项目概览里保存常用资料组合与上次停下的位置。 |
| 回忆一天的工作 | GitHub 可以按人员和日期回看仓库活动，Toggl Track 用周视图展现时间记录。 [GitHub 活动记录](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/using-the-activity-view-to-see-changes-to-a-repository) · [Toggl 周视图](https://support.toggl.com/en-us/article/tracking-time-in-the-calendar-view-1fftm9r/) | 从项目活动生成可勾选的日志素材，也可按项目补记实际用时。 |
| 文档审阅与交付 | WPS 云文档和 Dropbox 支持查看历史版本，Acrobat 跟踪共享审阅，禅道将发布关联到具体版本及其中的需求、缺陷。 [WPS 历史版本](https://www.wps.cn/learning/room/d/328483) · [Dropbox 版本历史](https://help.dropbox.com/delete-restore/version-history-overview) · [Acrobat 审阅跟踪](https://helpx.adobe.com/acrobat/desktop/share-and-review-documents/manage-reviews/track-reviews.html) · [禅道发布](https://www.zentao.net/book/zentaopms/515.html) | 把已发版本、交付对象和后续反馈串在一条记录里。 |
| 处理任务与请求 | Asana 模板可带子任务和附件，Linear 将新请求放入可接受、暂缓或标记重复的队列。 [Asana 任务模板](https://help.asana.com/s/article/task-templates) · [Linear 请求分拣](https://linear.app/docs/triage) | 熟悉的流程可以套模板，临时请求则先判断要办、要等还是归档。 |
| 会前约时间与会后落实 | Calendly 提供可预约时段，腾讯会议可从录制中提炼纪要和待办，OneNote 支持把选中的笔记文字转为 Outlook 任务。 [Calendly 预约页](https://calendly.com/help/about-scheduling) · [腾讯会议智能录制](https://meeting.tencent.com/support/topic/2228/index.html) · [OneNote 笔记转任务](https://support.microsoft.com/en-us/onenote/onenote-help-and-learning/create-outlook-tasks-in-onenote) | 把已有纪要贴进日程，选中一句生成行动项；经常对外约时间时再增加预约页。 |
| 摘录与查找资料 | Readwise Reader 支持在原网页上高亮并保存摘录，Rovo 可以跨已连接的应用查找资料。 [Readwise 摘录](https://docs.readwise.io/reader/docs/faqs/highlights-tags-notes) · [Rovo 搜索](https://support.atlassian.com/rovo/docs/search/) | 知识库可以增加带出处的段落摘录；工作台全局搜索可以同时找任务、日志和资料。 |
| 收集资料与审批 | 飞书用表单把提交内容汇总到多维表格，Slack 列表可接入表单和状态通知，钉钉宜搭流程表单可以配置审批和执行节点。 [飞书信息收集](https://www.feishu.cn/practice_template/47436) · [Slack 列表自动化](https://slack.com/help/articles/37752114318227-Set-up-automations-for-lists-in-Slack/) · [钉钉宜搭流程表单](https://docs.aliwork.com/docs/yida_support/wtwabe) | 经常向别人收材料时，提供一个表单入口，自己查看缺失项并确认收齐。 |
| 客户和费用跟进 | HubSpot 按联系人展示邮件、电话、会议等活动，Expensify 支持保存垫付费用和收据。 [HubSpot 活动时间线](https://knowledge.hubspot.com/records/filter-activities-on-a-record-timeline) · [Expensify 费用记录](https://help.expensify.com/articles/new-expensify/reports-and-expenses/Track-Expenses) | 对外协作多时按人查往来，出差多时按趟整理票据和报销进度。 |
| 梳理方案与目标 | Miro 可把便签和导图中的想法转成行动卡片，Asana 可以把目标与项目、任务或里程碑关联。 [Miro 构思工具](https://help.miro.com/hc/en-us/articles/4404066687122-Miro-for-ideation-brainstorming) · [Asana 目标进展](https://help.asana.com/s/article/progress-status-and-connecting-work-to-goals?language=en_US) | 对于资料很多的项目，可以从白板选出要执行的事项，也可用里程碑组织多周工作。 |
| 行政与业务运营 | 简道云提供资产借用和归还流程，Odoo 覆盖员工管理、询价和采购订单。 [简道云资产管理](https://hc.jiandaoyun.com/solution/16560) · [Odoo 人事](https://www.odoo.com/documentation/master/developer/reference/standard_modules/hr.html) · [Odoo 采购](https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/purchase/manage_deals/rfq.html) | 若承担行政或采购职责，可从个人经手的设备、供应商或询价记录开始。多人审批涉及组织角色和共享权限。 |

## 其他值得考虑的方向

| 方向 | 首版可以做到什么 | 何时值得做 |
| --- | --- | --- |
| 项目工作区 | 保存一组常用链接、置顶资料和一句「回来先做什么」，切换项目时直接打开。 | 多项目并行，尤其是同一批页面每天反复打开时；可放在知识库项目视图里。 |
| 会议行动项 | 一次会议关联纪要，选中一段生成待办，记录执行人、跟进日和原文位置。 | 会多、会后还要追进度时；可放在日程详情。 |
| 网页摘录与标注 | 保存选中文字、自己的批注、原网址和标签，检索后回到原始资料。 | 经常只需要网页中的一段说明时；可放在知识库。 |
| 工时与项目投入 | 在每日收集时补记每个项目用时，周末查看计划和实际投入的差异。 | 周报或项目复盘需要说明时间花在哪里时。 |
| 需求收件箱与收集表 | 通过表单收集请求、附件和期望日期，再接受为待办、暂缓或合并重复项。 | 有多个同事或客户持续提需求时。 |
| 联系人与跟进 | 按人查看相关项目、邮件、承诺和下次跟进日期。 | 跨部门、客户或供应商往来频繁时。 |
| 票据与报销 | 将账单、原始票据和出差项目对应起来，跟踪待提交、已提交、已到账。 | 经常垫付或报销时；可扩展现有记账面板。 |
| 全局搜索 | 一次输入同时检索任务、工作记录和知识条目，按模块或项目缩小范围，打开原文。 | 多个模块都有稳定数据、常常记不清信息存在哪里时。 |
| 项目里程碑 | 给阶段目标设截止日期，关联待办、交付版本和验收结果。 | 多个项目有明确交付节点时。 |
| 预约页 | 分享可预约时段，让对方选时间并生成日程，避免重复占用时段。 | 频繁与外部人员反复商议时间时。 |
| 项目白板 | 把已有的资料和待办排成简图，用连线表达依赖，把选中的便签转为下一步行动。 | 经常需要整理复杂方案、向别人讲清关系时。 |
| 设备与采购台账 | 登记个人经手的借用、归还、询价和交付状态，按日期查看待处理记录。 | 有明确的资产或采购职责时。 |

工作知识库已规划标签、日期和关键词检索。截图文字识别与 PDF 正文索引是否进入首版仍待定，AI 自然语言查找是后续方向。分类预算和独立决策记录已暂缓。 [工作知识库](08-work-knowledge-base.md) · [每日工作记录与周报交接](06-work-log-weekly-report.md)
