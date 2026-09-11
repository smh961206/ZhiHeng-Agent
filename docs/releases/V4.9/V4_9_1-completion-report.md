# V4.9.1 完成报告

本阶段完成 canonical Vision request 与 Gateway requiredCapabilities 校验。createVisionRequest 复制图片消息，校验图片数量、数据 URL、页码和区域；Gateway 对声明能力要求严格 true，并拒绝 Vision 中的工具／私有续接及非 user 图片。既有请求 wire 与文本结果保持兼容。

修改：server/vision-model.mjs、server/model-gateway.mjs、现有清单检查器／清单测试；新增 tests/vision-request.test.mjs 和本报告。原 V4.9.0 指纹保留为 sha256，后续已审阅变化单列 currentSha256。无删除；架构仍由 wrapper→Gateway→adapter 负责。无持久化 schema、迁移、环境或 feature flag 改动；API、checkpoint、原始截止日与恢复兼容。未外发用户材料，未付费或切换生产。

修改前视觉/OCR/Gateway/Catalog 相关基线通过；修改后 canonical request、视觉、迁移、Gateway、健康共 70 个测试通过，清单相关 17 个通过。未知能力不放行，图像只进入 user 消息。无主模型变化，不适用新模型质量比较。回滚撤回本阶段 request 校验和测试并刷新清单即可，无数据操作。

限制：图像头的格式检查不是完整解码验证，实际渲染／解码仍属既有 worker。V4.9.2 响应元数据及 V4.9.3–.8 后续工作未在本阶段实施。
