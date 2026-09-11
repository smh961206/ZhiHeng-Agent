# V4.9.8 完成报告

晋升门槛与回滚路径已实现并完成离线逻辑验证；真实模型晋升未获准。新 server/vision-policy.mjs 只负责视觉准入，避免 text rollout→modelState→Catalog 循环依赖；复用现有 Gateway、Catalog、连接身份与纯 grader，不建立 V5.0 champion 系统。

准入要求：真实调用测量标记、固定 48 案例语料、完整唯一结果、baseline/candidate 原件／图片一致、实际模型／连接／能力配置和代码指纹、候选所有关键维度通过、与比较文件哈希绑定的人工视觉审核和回滚见证。重新评分实际输出，不信任报告自填分数；模拟比较永久无准入资格。操作人批准文件是可信见证，不是防伪造的密码学远程证明。

FEATURE_VISION_ROUTING 默认关闭。开启且准入有效时，新的独立视觉调用可选候选并保留 legacy 备用；已有 legacy pin 和完全没有 modelState 的历史任务仍走 legacy。新研究按实际选择保存现有结构的视觉 profile/connectionIdentity；候选 pin 在撤销准入／回滚时安全暂停，原检查点／原资料时点保留，不能降格续跑。密钥轮换不改变身份。

修改：model-state、model-routing、vision-model、视觉基准脚本、start-legacy、.env.example；新增 vision-policy、tests/vision-policy.test.mjs、tests/vision-state.integration.mjs、合成批准测试夹具及本报告。无删除、数据库字段／索引或 schema version 变化；ModelProfile v3 是配置类型，新 pin 只使用既有字段的新值。详见 schema/migration/rollback 对兼容、旧读者拒绝、无回填、时点和 provenance 的分析。

门槛单测通过；真实 MongoDB／进程退出恢复测试通过；旧文本状态／升级／视觉 wire 回归通过。最终完整套件记录见 [全版交付报告](V4_9-completion-report.md)。基准报告保留两侧已知用量与未知计费；48 原件／96 次模拟调用只验证流程。未调用真实模型、未修改 .env、未部署生产或写入正式批准文件。

一键回退 pnpm start:legacy 同时强制文本 legacy 与 FEATURE_VISION_ROUTING=false，无需编辑历史数据。限制：合成英文两行表格不代表全部真实中英财报；真实候选型号、预算、调用质量与人工审核尚缺，当前生产晋升决定为不晋升。已 pin 的研究不支持跨模型 fallback，避免破坏恢复身份；独立新调用可使用已准入 fallback。
