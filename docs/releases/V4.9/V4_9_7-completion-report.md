# V4.9.7 完成报告

现有 readVisionResult 增加显式、已认可的同图片能力 fallback。最多两个独立请求，共用 60 秒截止时间；只对 capability／format／部分 provider 错误启用，返回成功备用的实际身份和两次安全尝试记录，不合并任何部分输出或隐藏推理。

修改 server/vision-model.mjs；新增 tests/vision-fallback.test.mjs、本报告。无新的传输／队列／持久化 schema、迁移、环境、公共 API 或默认策略启用；内存结果可选 attempts 字段向后兼容。图片／源日期不改；任何 job pin 禁止回退，未读清的成功内容不触发模型循环。

fallback、候选、响应、旧 wire、modelState 和视觉共 43 个测试通过：503／429／网络／无效格式最多回退一次；两次故障即止；auth／拒绝／截断／取消不回退；成功但 unreadable 不回退；两次图片消息完全一致；已固定模型任务不换模型。无真实请求或质量比较，候选认可只用于隔离测试，生产尚未启用。

回滚停止传入 fallback 配置并撤回这项增量，无数据操作。限制：下游 transcript JSON 验证仍归现有读取器；通用 Gateway/协议格式错误可回退，但不能把下游财务或证据校验失败升级为模型故障。V4.9.8 负责生产晋升门槛。
