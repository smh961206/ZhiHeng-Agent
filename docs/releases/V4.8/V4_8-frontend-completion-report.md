# V4.8 前端同步与体验优化

范围：用户授权在 V4.8 模型基础完成后同步优化平台文案、样式和交互。正式模型质量验收仍按原记录延期，付费试跑继续搁置；本轮不切换模型策略。

## 实际更新

- 全站：顶部新增可展开的平台说明，明确区分模型已配置、待配置、检查中和状态待确认。使用已有配置查询与重试，不把配置存在写成连接健康或质量验收通过。弹层支持键盘关闭、焦点返回及手机滚动。
- 首页：显示平台 V4.8，整理研究价值与操作说明；说明无需在表单里手动选择模型、缺失资料不能由模型升级代替取证。保留现有六路径、服务开通与使用指南入口。
- 工作台：文案聚焦公司、问题和研究范围；显示已有 Ctrl/⌘ + Enter 提交快捷键，并提供无障碍快捷键属性。原有准备检查、暂存、标的确认和防重复提交行为保留。
- 研究记录：引导用户区分进行中、已交付及待处理任务，回查证据或按任务保存进度继续。
- 研究过程：原页读取说明不再硬编码 Pro 为所有任务的分析者；从本次任务已保存的公开配置展示分析、原页读取模型，强调配置不代表实际调用，保留已读/遗漏/拒绝范围及原始证据入口。
- 样式：延续深绿品牌，统一页面背景、边框、选中导航、卡片和焦点样式；优化首页、表单及记录页层级。桌面和 320px 手机分别验收。
- 交互：首页两组轮播增加独立暂停/继续控制；保留原有键盘、悬停、离屏和减弱动态效果保护。

## 工程记录

1. 版本：V4.8 前端同步；CURRENT 保持 V4.8，不进入 V4.9。
2. 修改文件：src/App.jsx、src/main.jsx、src/components/ResearchFramework.jsx、src/components/ResearchWorkbench.jsx、src/components/ResearchHistory.jsx、src/components/DocumentReadingSummary.jsx、src/hooks/use-tab-autoplay.js、tests/workspace-ui.integration.mjs、docs/architecture/current-implementation-map.md、docs/releases/V4.8/DETAILED_INDEX.md、MANIFEST.json。
3. 新增文件：src/components/PlatformStatus.jsx、src/platform.css、tests/platform-v48-ui-scenarios.mjs、本报告。artifacts 下保存本轮忽略的日志、截图和哈希记录。
4. 删除文件：无；原有场景均保留。
5. 架构：沿用现有 React 页面、UI 组件和配置 hook；无新业务 API、模型客户端、后台服务或平行系统。
6. Schema：无持久化字段、Mongo schema 或契约版本变更。
7. 迁移：无；历史任务无模型记录时不补造，已有任务继续按原恢复逻辑处理。
8. 环境：无项目依赖、锁文件或生产环境修改。使用现有 Vite、捆绑 Playwright 与 Edge；数据库测试只连接 127.0.0.1:27029 隔离服务。
9. 兼容：研究参数、接口、模型路由、财务计算、Evidence 与 Knowledge 规则不变。平台版本与研究规则版本分别展示，不修改规则版本 4.7。
10. 恢复：只补充展示说明；原保存重试、检查点兼容性、原始截止日、工具恢复及模型配置固定逻辑保持。
11. Feature flags：无新增；legacy 不变，付费试跑仍 deferred-by-user，无自动恢复或付费授权。
12. 测试命令：见下节。
13. 结果：753 项单元、14 项数据库/恢复集成、5 个路由通过；277 个浏览器场景均已覆盖，完整运行 273 通过、4 个旧界面预期失败，更新后相关复测 9/9 与 2/2 通过，按场景核对无剩余失败。清单共 479 个文件。
14. Benchmark：未运行付费模型或真实质量对照。单元内既有合成安全案例不代表真实模型质量。
15. 安全隐私：顶部仅消费公开配置状态；任务模型名称来自已有公开字段，不读取私有 modelState、连接、密钥或推理内容。UI 测试拦截 API，使用内存夹具，不创建真实研究。
16. 回滚：仅撤回本报告所列前端、测试和文档修改；参照 artifacts/v4-8-ui-baseline.json 核对范围，保留此前已接受的未提交模型平台工作。无需数据库迁移或配置回滚。
17. 限制：本轮不做 Linux 部署；构建保留既有主包超过 500 kB 的提醒，不提高阈值隐藏提醒。模型健康、费用和政策启用状态尚无对应前端公开 API，本轮不凭空展示。
18. 延期：真实 MAIN/PRO 验收、两标的付费试跑、模型成本/健康管理界面、构建包进一步拆分以及 V4.9+；本轮没有顺带实施。

## 验证记录

- node --test tests/*.test.mjs：753 通过，0 fail/skip/cancel；artifacts/v4-8-ui-unit.log。
- pnpm test:mongodb：7 通过，0 fail/skip/cancel；artifacts/v4-8-ui-mongodb.log。
- node --test tests/model-state.integration.mjs tests/research-resume.integration.mjs tests/model-telemetry.integration.mjs tests/knowledge-api.integration.mjs：7 通过，0 fail/skip/cancel；artifacts/v4-8-ui-integration.log。
- pnpm test:routes：5 个路由场景通过；artifacts/v4-8-ui-routes.log。
- node node_modules/vite/bin/vite.js build：成功；保留超过 500 kB 的构建提醒；artifacts/v4-8-ui-build.log。直接调用构建器避免无关的 Knowledge 备份写入。
- pnpm test:ui：完整运行未设置 UI_TEST_FILTER，277 场景中 273 通过、4 个旧界面断言失败，退出 1；原始结果与截图保留于 artifacts/v4-8-ui-acceptance/。修正后 UI_TEST_FILTER=framework-autoplay|platform-v48 的 9/9、UI_TEST_FILTER=handbook-current-features 的 2/2 复测均通过，退出 0。按场景结合实际复测结果，277 场景全部验证通过，不声称最初完整运行退出 0。汇总及每项证据来源：artifacts/v4-8-ui-verified-results.json。

新增六个浏览器场景检查手机/桌面平台弹层、失败状态及重试、历史模型配置、未配置状态和暂停轮播。最初聚焦检查中，断言把“**不表示**已启用自动升级”误判为肯定陈述，另有媒体偏好切换尚未渲染就检查数量的时序错误；已分别修正为明确否定断言和等待隐藏，未降低产品约束。视觉检查发现首页卡片背景与原白色文字对比不足，已恢复与文字匹配的深绿背景。

完整回归期间识别并调整四个旧版界面断言：两种宽度下“轮播按钮数量为 0”更新为存在一个暂停按钮；两种宽度下旧卡片 16px 圆角、1px 顶边更新为当前 14px、3px。轮播节奏、键盘焦点、悬停/离屏暂停、页面不跳动、手册导航等原断言保留。轮播与新增平台场景复测 9/9 通过，手册场景复测 2/2 通过，均退出 0；分别记录于 artifacts/v4-8-ui-controls.log 和 artifacts/v4-8-ui-handbook.log。

桌面/手机人工视觉复核：artifacts/v4-8-ui-acceptance/ui-homepage-hero-1440.png、ui-homepage-hero-320.png、ui-empty-workbench-1440.png、ui-history-320.png，以及 v4-8-ui-controls 下的平台说明与模型记录截图。预览使用合成数据，不代表真实研究或模型质量。

最终核对：11 个已有文件修改、4 个新增文件、无删除；详见 artifacts/v4-8-ui-audit.json。server/shared/knowledge 与本轮开始时哈希一致；实际公开配置 requested=legacy、active=legacy、reasons=[]。无新付费调用或部署。node --test tests/harness.test.mjs 验证 479 个清单文件；最终单元结果仍为 753 通过。
