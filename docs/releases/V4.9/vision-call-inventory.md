# V4.9.0 — Vision 调用与限制清单

状态：CURRENT inventory；2026-09-11 核对。机器清单为 [vision-call-inventory.json](vision-call-inventory.json)。本轮只盘点和验证现有实现，不改变模型、提示词、数据或执行路径。

2026-09-11 第二轮回归复核：公开模板已改为 Coding 候选端点及本地正式批准文件路径；已逐项核对两份模板，仍为 legacy、FEATURE_VISION_ROUTING=false，密钥为空。模型注释统一为实际配置名，生产示例明确路径不等于容器挂载。机器清单仅同步 `.env.example` 的 currentSha256，保留原 sha256、调用数、限额和证据断言；未修改真实模型比较或批准文件。下文为 V4.9.0 原始盘点，后续实现以当前 release 文档为准。

## 发布边界与文档冲突

用户明确选择 V4.9，因此 CURRENT 从 V4.8 改为 V4.9。V4.8.11 的真实质量验收仍延期，不能因为切换指针而标记通过。V4.8 已接受的 Catalog/Gateway/视觉调用迁移足以支持本次无运行时改动的盘点；不启用付费试跑或生产策略。

DETAILED_INDEX 与 normalized subrelease 是执行顺序：V4.9.0 为调用盘点，V4.9.1 才是 canonical request。README/implementation 的旧五组概览不能被解释为另一套编号。部分 V4.8 历史报告的“V4.9 未开始”描述保留其历史语境，现行激活说明以 CURRENT 和本报告为准。

## 当前调用图

| 入口／场景 | 所有者和调用路径 | 原件与失败语义 |
|---|---|---|
| 上传 PDF、自动采集 PDF 的选择性补读 | document-reader → material-vision 或 pdf-extractor → enhancePDFWithVision → readVisionImages | 选择扫描／图表／财务页；保留 native/OCR 正文，视觉块单列；失败保留程序提取及缺口 |
| 上传或采集图片 | document-reader → material-vision → readImageMaterial（非上传直接进入后者）→ readVisionImages | 渲染概览及重叠裁片，逻辑页为 1；失败不伪造已读结果 |
| 审计复读原件 | Agent.refreshVisualContext → visualAuditContext → readVisionImages | 从内容寻址归档加载；核对补充文字关联；去重、限额、记录 omitted；分析／审计模型只收到转写 |
| Agent 定向原页读取 | read_source_pages(view=visual) → createAgentPageReader → readVisionImages | 仅本次已采集官方 PDF；复取原 URL、比对原件 SHA-256；保留来源、页码及单独读取记录 |

四个语义调用点共同进入 server/vision-model.mjs 的 readVisionImages，再经 model-gateway → model-adapter → 唯一供应商传输入口。PDF 不直接发送给供应商；发送 user 消息中的 image_url，高细节模式，并附实际页码／区域。系统消息明确禁止执行原件指令、补造数字。

入口中还有 server/index.mjs 的材料读取 API、pdf-extractor 的启用判断，均不增加供应商调用点。诊断脚本 scripts/vision-input-diagnostics.mjs（合成 PDF、复读）和 scripts/dual-model-diagnostics.mjs（合成图片、分析）复用这些路径，是可发起真实请求的显式诊断，本轮没有执行。OCR worker/Tesseract、native PDF、Office 文本解析不是模型调用。

## 当前限额

下表来自源代码人工核对；JSON 中每项有可定位的源码片段，检查器在漂移时失败。默认预算和硬上限分开描述，不能将所有场景误写为同一个全局页数限额。

| 限制项 | 所有者 | 当前行为 |
|---|---|---|
| wrapper-images | server/vision-model.mjs | 1–12 rendered images per request; crops count as images. |
| wire-options | server/vision-model.mjs | Non-stream request with 6000 output-token budget. |
| gateway-images | server/model-gateway.mjs | Gateway also enforces 1–12 images. |
| output-tokens | server/model-gateway.mjs | Explicit Vision output budget cannot exceed 6000 tokens. |
| request-bytes | server/model-adapter.mjs | Serialized request limit is 16 MiB, including text/base64. |
| vision-timeout | server/model-adapter.mjs | Vision idle and total deadlines are 60 seconds; outer cancellation may be shorter. |
| response-bytes | server/model-adapter.mjs | Vision response limit is 512000 bytes. |
| response-characters | server/model-adapter.mjs | Vision must finish with stop, without tool calls, at most 18000 JS string code units. |
| single-attempt | server/model-adapter.mjs | Vision uses one fetch attempt, no research network retry or model cycling. |
| research-pages | server/visual-reading.mjs | Default process-local async research enhancement budget: 6 logical pages, charged before attempt. |
| pdf-pages | server/visual-reading.mjs | Default automatic enhancement: 2 selected PDF pages per document. |
| render-timeout | server/visual-reading.mjs | Rendering worker deadline: 30 seconds. |
| transcript-size | server/visual-reading.mjs | Each page text <=7500 code units, <=20 uncertainties, each <=500 code units. |
| audit-pages | server/visual-reading.mjs | Separate audit reread window: 6 logical pages by default. |
| audit-images | server/visual-reading.mjs | Audit images window measured in serialized JS string length, not decoded bytes: 12 Mi. |
| audit-timeout | server/visual-reading.mjs | Shared audit reread deadline: 90 seconds. |
| refresh-age | server/visual-reading.mjs | Incomplete automatic visual upgrades require 6-hour age and remaining process-local budget. |
| upload-bytes | server/material-vision.mjs | Visual material upload: nonempty and at most 10 MiB. |
| upload-pages | server/material-vision.mjs | Uploaded PDF: at most 100 physical pages. |
| upload-parse | server/material-vision.mjs | Upload native parsing deadline: 45 seconds, fallback parsing also 45 seconds. |
| upload-text | server/material-vision.mjs | Upload extracted text limit: 20000 code units. |
| pdf-scale | server/visual-render-worker.mjs | PDF scale <=2.5 and longest side <=2000 px (rounded canvas). |
| image-pixels | server/visual-render-worker.mjs | Raster dimensions checked after image decoding: <=40 million pixels. |
| image-scale | server/visual-render-worker.mjs | Raster longest side <=2000 px, no upscaling. |
| crops | server/visual-render-worker.mjs | One overview; if height >950, three overlapping 40%-height full-width strips. JPEG quality .88. |
| tool-pages | server/agent-page-reader.mjs | 1–3 unique physical pages, integers 1–2000 and within recorded source.pages. |
| tool-budget | server/agent-page-reader.mjs | Separate targeted-page fetch budget: default 16 logical pages from job.agentPageReads. |
| tool-fetch | server/agent-page-reader.mjs | Existing source fetch: 32 million bytes, 45s request /60s total, retries:1. This is document retrieval, not model retry. |
| tool-extract | server/agent-page-reader.mjs | Targeted native extraction deadline: 45 seconds; worker heap 384 MiB. |
| tool-text | server/agent-page-reader.mjs | Tool output window: 40000 code units, startBlock 0–1000. |
| archive-bytes | server/visual-assets.mjs | Visual archive maximum: 16 MiB; content-addressed file. |
| archive-images | server/visual-assets.mjs | Archive load requires 1–12 PNG/JPEG data URLs and positive page integers. |
| upload-concurrency | server/index.mjs | At most 2 material imports per process. |
| upload-timeout | server/index.mjs | Material import route deadline: 110 seconds. |
| native-pages | server/pdf-processing.mjs | Native PDF parser default/hard max 600 pages and 1500000 code units. |
| ocr-pages | server/pdf-processing.mjs | OCR default 4 pages, max 12; local OCR is not a Vision model call. |
| ocr-budget | server/pdf-processing.mjs | OCR default 90s budget, max 180s, each page <=45s. |
| pdf-timeout | server/pdf-extractor.mjs | General parser worker default deadline 180s; partial native extraction may survive timeout. |

## 模型名称分支与配置

- model-routing 提供 LLM_VISION_MODEL 的既有默认值，视觉地址／密钥可独立配置或回退到分析连接。这只是配置选择。
- model-catalog 的 legacyVisionImageInput 按精确既有型号或 LLM_VISION_INPUT=images 启用图片，off 关闭；Vision wrapper 通过 Catalog 能力及凭据判断可用。名称逻辑位于兼容配置所有者，不在文档读取业务中。
- model-adapter 对精确既有 Vision 型号保留 thinking=disabled；显式 legacy reasoningEffort=off 另有 DeepSeek 家族兼容检查。普通视觉 wrapper 未设置 effort。
- 新的 FEATURE_VISION_ROUTING、VISION_PRIMARY/FALLBACK 切换本轮均未实现。既有 MODEL_ROUTING_MODE / MODEL_TELEMETRY_ENABLED 没有变化，未知供应商能力／价格仍未知。V4.9.3 才处理剩余模型名称能力逻辑。

## 证据、归档与恢复

视觉转写始终是待核实证据：保留页码、method=vision、needsReview、uncertainties、原件 SHA-256／归档引用；native/OCR 块不被替换。数字匹配检查始终 needsReview=true，不证明币种、单位、期间、行列或经济含义。财务验证、审计及引用规则仍由现有所有者执行，文件／图片指令作为不可信内容处理。提示词约束不是对提示注入免疫的证明。

归档保存实际渲染图像、原文指纹和转写，并按内容哈希加载；用户文字被编辑后关联失效。目标页读取重新下载同一已采集 URL 后检查原件哈希，源日期与原始正文／覆盖不被改写。该检查不能声称实现了全系统历史发布日期验证。

已存在 ModelCall 可记录 purpose/profile、用量／性能及未知账单，不保存图像、正文、密钥或隐藏推理；上传发生在研究 job scope 外时 jobId 可以为空。视觉归档本身不保存每次读取的模型 profile，不能把当前配置倒推为历史实际调用身份。

恢复继续复用已有 job/checkpoint：定向页读取次数由 job.agentPageReads 保存；审计 visualSignature 防止兼容恢复的无变化重读；正文块按 ID 去重。自动补读的 6 页预算为进程内 AsyncLocalStorage，审计另有 6 页窗口，不能宣称为跨重启统一持久预算。归档按内容去重不保证所有多次请求 exactly-once；本轮不改变任何恢复行为。

## 可执行证据与限制

运行 node scripts/check-model-call-inventory.mjs --vision --baseline，扩展现有 V4.8 检查器，复用全仓端点扫描及 Gateway 边界；V4.8 原清单和历史哈希保持不变。新清单覆盖 20 个源码／配置示例文件、四个语义调用点、五个直接引用 wrapper 模块的消费者，记录本轮基线提交及 UTF-8/LF 指纹。

tests/vision-call-inventory.test.mjs 验证遗漏调用、未登记静态／动态导入、限制与证据守卫漂移、仅更新指纹却遗漏说明、非法路径及扫描范围、换行兼容。已有 visual-reading、router-vision-migration、OCR、原页读取及财务证据测试证明其各自行为。源码指纹和词法扫描只是漂移警报，不能发现一切动态调用技巧，也不能自动证明说明文字的全部语义。

## 留待后续子版本

V4.9.1–.2：canonical request/response 及明确的逐次视觉读取身份／来源表达；不得补造历史模型身份。V4.9.3：能力声明中的名称兼容逻辑。V4.9.4–.5：至少 40 个冻结视觉案例和数值／单位／表头／符号／日期／脚注／表格关系评分。V4.9.6–.8：离线 challenger、受限 fallback、主模型晋升准入。当前没有这些质量结果，也没有供应商更换。

跨重启统一视觉预算、全局 exactly-once、完整历史日期 enforcement 属于待评估问题，不在 V4.9.0 顺手实现。既有图像解码后才检查像素数、归档不含逐次模型身份等限制如实保留；任何修复须进入相应授权范围。V4.8.11 文本策略真实质量验收仍单独延期。
