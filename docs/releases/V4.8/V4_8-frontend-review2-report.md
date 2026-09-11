# V4.8 页面与版本表述优化

用户要求继续优化首页、工作台、研究记录、详情和手册，移除三张截图中的正常规则状态横条，修正工作台步骤栏对齐，并核对 V4.7 表述。

## 结论与变更

V4.7 作为当前研究规则或历史任务规则版本是准确记录；作为平台版本、当前迭代标题或“本次更新”则容易误导。代码 shared/research-framework.mjs 实际仍为 frameworkVersion=4.7，Harness CURRENT 为 V4.8。不能为了视觉一致把所有 4.7 替换为 4.8，否则会误标历史记录，甚至影响版本兼容性判断。

- 首页/工作台/手册：正常就绪与初始加载不再渲染 KnowledgeStatus 横条，减少重复内容。连接异常、版本不匹配、尚未配置及待校验修订仍有明确提示；表单准备检查、提交禁用及输入保留不变。
- 顶部平台说明：增加折叠的“平台版本与研究规则”解释及检查入口；不匹配时显示“页面需更新”，不以模型已配置掩盖规则不兼容。
- 工作台：在原 workbench-layout 样式中平衡步骤栏上下留白，固定圆标尺寸并居中，四列/手机两列保持原顺序；没有另建步骤逻辑。
- 研究记录：压缩引导文案，优先呈现进度、报告、证据和未完成任务。
- 手册：去掉方法标题前模糊的版本标签和过时的“本次更新”；规则版本放入解释区，明确历史规则及快照不随平台更新改写；调整标题间距。
- 详情：版本标为“本报告规则 V…”和“本次研究规则版本”；历史 4.3、当前 4.7 和缺失版本分别保留，不回填 4.8。“本次规则依据”明确版本属于规则。
- 恢复说明：纠正“版本变化后自动按当前规则重新研究”的过度承诺，说明兼容性检查、原时点以及页面明确提供的恢复入口；实际恢复算法无修改。

## 工程记录

1. 版本：V4.8 前端后续优化，CURRENT 不推进。
2. 本轮修改：src/components/ResearchKnowledge.jsx、PlatformStatus.jsx、ResearchMethod.jsx、ResearchDetail.jsx、ResearchUsageGuide.jsx、ResearchHistory.jsx、ResearchHandbook.jsx、src/components/workbench-layout.css、src/platform.css；tests/knowledge-platform-ui-scenarios.mjs、tests/platform-recovery-ui-scenarios.mjs、tests/workspace-ui.integration.mjs；当前实现映射、V4.8 详细索引和 MANIFEST.json。
3. 本轮新增：tests/fixtures/platform-status-ui.mjs、tests/platform-cleanup-ui-scenarios.mjs、本报告；忽略的 artifacts 保存日志和截图。
4. 删除：无文件或测试场景删除。
5. 架构：现有展示与兼容性所有者复用，无新增后端 API 或业务子系统。仓库同时存在工作台按需加载及导出拆分的其他改动；已保留，不归为本轮实现。UI 接入预检兼容实际存在的 ResearchWorkbenchPage 包装入口，同时仍要求详情页接入。
6. Schema：无。
7. 迁移：无，规则与快照数据不改写。
8. 环境：隔离 Vite 前端 127.0.0.1:5192，现有捆绑 Playwright + Edge；MongoDB 使用 127.0.0.1:27029 的隔离服务和随机临时数据库。没有模型付费请求，源码依赖清单、生产环境与部署配置本轮未改动。
9. 兼容：正常状态横条按用户要求取消，其测试改为核对顶部就绪状态及正文无横条。所有异常、提交阻断、规则记录读取、旧报告与恢复断言保留。
10. 恢复：仅说明文字校准；原始研究时点、模型配置检查、历史数据保留及只重试保存语义不变。
11. Feature flags：无新增；保持 legacy，付费试跑继续搁置。
12. 测试命令：见下节实际记录。
13. 结果：完整浏览器 286/286、定向浏览器 32/32、单元 753/753、路由 5 个、数据库及恢复集成 14/14、Harness 7/7 均通过，构建成功。
14. Benchmark：没有真实模型质量或成本测量；合成测试不作为真实研究验收。
15. 隐私/安全：版本元数据来自现有公开配置和任务记录；不显示私有推理或连接信息，未访问真实研究库。
16. 回滚：仅撤回本报告列出的修改，依据 artifacts/v4-8-ui2-baseline.json 和 artifacts/v4-8-ui2-audit.json 识别本轮范围；不撤销并行发生的工作台加载改动及更早的已接受工作。审计核对 662 个后端、shared、Knowledge、依赖及发布指针文件，均与本轮开始时哈希一致；本轮 15 个修改文件、3 个新增文件、0 删除，其他任务变化单独记录。无数据库回滚。
17. 限制：本轮未部署；平台/研究规则版本可不同。未公开模型健康与成本状态，不捏造相关指标。最新构建主包 550.34 kB，仍有超过 500 kB 的体积提醒；并行的加载拆分不归为本轮成果，不由此改变模型质量验收状态。
18. 延期：付费试跑、MAIN/PRO 真实质量验收及生产切换、V4.9+。

## 测试证据

- pnpm test：753 通过，0 fail/skip/cancel；artifacts/v4-8-ui2-unit.log。
- pnpm test:routes：5 个场景通过，退出 0；artifacts/v4-8-ui2-routes.log。并行环境曾出现现有 WebSocket 调试端口占用提醒，渲染断言均通过。
- pnpm test:mongodb：7/7 通过，0 fail/skip/cancel，退出 0；artifacts/v4-8-ui2-mongodb.log。
- node --test tests/model-state.integration.mjs tests/research-resume.integration.mjs tests/model-telemetry.integration.mjs tests/knowledge-api.integration.mjs：7/7 通过，0 fail/skip/cancel，退出 0；artifacts/v4-8-ui2-integration.log。含真实进程退出后从隔离 MongoDB 恢复。
- node node_modules/vite/bin/vite.js build：通过，退出 0；最新记录 artifacts/v4-8-ui2-build-final.log。
- pnpm test:ui，UI_TEST_FILTER=platform-cleanup|knowledge-v47|platform-service-blocks|platform-v48|platform-current：32/32 通过；artifacts/v4-8-ui2-focused.log。
- 完整 pnpm test:ui：无过滤器，286/286 通过，退出 0；日志 artifacts/v4-8-ui2-acceptance.log，截图位于 artifacts/v4-8-ui2-acceptance/。浏览器 API 使用内存夹具，没有真实模型调用。
- node --test tests/harness.test.mjs：7/7 通过；最终更新文档及清单后复核，日志 artifacts/v4-8-ui2-harness-final.log。

新增九个场景验证 320/1440/2560 宽度下四个入口无正常横条、步骤按钮与圆标中心对齐且点击区不少于 44px、4.3/4.7/缺失报告规则版本的真实性。已有异常阻断与规则读取场景通过。定向测试初次因新增测试模块缺少闭合括号未启动，修复后全部通过。完整预检曾因其他任务将工作台改为按需加载而误报未接入；已按实际入口修正，未回退产品实现或跳过行为验证。

## 后续截图修正：手册双分隔线

用户指出标题底边与标签栏顶边重复。现仅调整 src/platform.css 中 handbook-heading：取消底边、去掉 24px 外边距并将底部内边距设为 24px，标签栏仍由原样式负责分隔。已查看实际截图，标签栏上方只保留一根线。

右上角和正文异常提示复用同一份公开配置：顶部简述状态，正文提供处理原因及操作；版本不兼容在顶部显示“页面需更新”，正文解释版本不一致。模型已配置并不代表规则修订已通过校验，两者含义不同。此次未改变状态判断、异常提示、刷新入口或创建阻断。

本次为 V4.8 样式修正；修改 src/platform.css、本报告与 MANIFEST.json，无新增或删除产品文件。架构、schema、迁移、环境配置、兼容、恢复、feature flags 及安全隐私边界均不变。无模型基准或付费调用，无部署；回滚仅恢复该选择器原有样式。真实质量验收及后续版本仍延期，既有构建体积提醒保留。

pnpm test 再次通过 753/753，0 失败、跳过或取消，退出 0；日志 artifacts/v4-8-handbook-divider-unit.log。已关闭本次隔离前端。

实际验证：使用隔离前端 127.0.0.1:5192 运行 pnpm test:ui，UI_TEST_FILTER=platform-cleanup|knowledge-v47|platform-service-blocks|platform-v48|platform-current，35/35 通过，退出 0；日志 artifacts/v4-8-handbook-divider.log，截图目录 artifacts/v4-8-handbook-divider/。node node_modules/vite/bin/vite.js build 成功，退出 0，日志 artifacts/v4-8-handbook-divider-build.log。本次为定向浏览器复核，不将前节完整浏览器数量重复计为本次运行。
