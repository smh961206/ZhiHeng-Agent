# V4.9.3 完成报告

本阶段确认并强化 V4.8 已建立的业务能力边界：Vision readiness 的型号展示也取自 Catalog；七个视觉业务所有者禁止具体型号比较和 thinking 决策，兼容分支只保留在 Catalog/adapter。不是简单删掉既有型号兼容，而是保留旧 wire 并自动阻止业务重新耦合。

修改 server/vision-model.mjs、scripts/check-model-call-inventory.mjs；新增 tests/vision-capability.test.mjs 和本报告。无删除，无新的架构所有者、持久化 schema、迁移、环境、flags、API 或恢复行为变化。未知型号仍须显式图片能力，未切换主模型。

能力／Catalog、旧与新清单、router/Vision migration 共 52 个通过。新增测试向七个业务文件注入型号／thinking 分支并要求失败；既有型号和显式自定义服务 wire 保持。初次运行发现旧测试期望错误包含 Gateway，修正检查器消息后通过，未修改或放宽旧断言。

无新模型质量比较、付费或材料外发；保持未知能力和证据语义。回滚撤回本阶段展示来源和静态检查／测试，刷新清单，无数据操作。V4.9.4–.8 未在本阶段实施。
