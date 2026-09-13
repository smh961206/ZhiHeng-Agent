# 阶段化多模型配置与研究管线重构方案

状态：**PROPOSED / M1.0 规划，尚未实施**
编制日期：2026-09-12
适用范围：ZhiHeng Agent 模型配置、Model Gateway、研究任务生命周期及模型可观测性
发布边界：当前发布为 V5.2（Flagship Pool / Judge）。本方案安排在 V5.2 完成之后，登记为独立模型轨道 **M1.0**，不占用已经分配给 Knowledge Engineering 的核心版本 V5.3。M1.0 复用 V5.1 的价格、成本与缓存能力，以及 V5.2 的旗舰模型池、关键复核和证据裁决能力；统一研究预算已在后续配置简化中退役。

## 1. 方案结论

模型由用户自行指定。平台对外只保留两层概念：

1. **可用模型**：配置模型名称、接口地址和密钥引用。
2. **研究环节分配**：指定每个语义环节使用哪个模型。

用户不再配置 `MAIN / PRO`、Challenger、Champion、A/B、策略注册表、策略版本、失效文件、能力验收文件、研究预算、`capabilities` 或 `adapterOptions`。V4.8–V5.2 已实现的研究运行能力继续保留；M1.0 取消批量付费试跑、人工验收文件、统一研究预算和重复配置负担，同时保留 Gateway、多模态、模型状态、成本记录、旗舰复核与 Judge。

建议保留六个可分配的模型环节：

| 环节 | 主要职责 | 默认建议 |
|---|---|---|
| Input | 研究路径识别、证券实体和意图识别 | 快速、稳定、低成本模型 |
| Vision | PDF 页面、图片、表格及原始材料视觉读取 | 固定视觉模型 |
| Researcher | 问题分析、研究规划、工具选择、证据理解、数据解释 | 主研究模型 |
| Writer | 根据冻结后的公开上下文生成研究报告草稿 | 主研究模型，可与 Researcher 相同 |
| Evidence Verifier | 判断补充检索结果是否真正支持目标主张 | 主研究模型或更小的严谨模型 |
| Auditor | 最终审查、反证检查、引用和结构修复 | 独立审计模型 |
| Critical Reviewer（可选） | V5.2 的异常复杂任务关键复核 | 用户指定的旗舰模型池 |
| Judge（可选） | V5.2 的重大 L1/L2 证据冲突裁决 | 用户指定的旗舰模型池 |

最常见的部署只需要 **5 个模型别名**：`fast`、`vision`、`research`、`audit`、`flagship`。前六个普通环节可以复用四个模型；两个非常规环节可以复用一个旗舰模型。关闭非常规环节时仍只需要四个模型，平台不要求每个环节使用不同模型。

## 2. 为什么按环节设计

当前普通研究代码已审计出 10 个生产语义调用入口，它们实际只对应 5 个旧 `purpose`：`router`、`research`、`followup`、`review`、`vision`。V5.2 另外增加 `critical-review` 和 `judge` 两个非常规入口。主要问题不是模型数量不足，而是旧配置同时暴露运行、试跑、候选晋级和人工验收概念，且 `research` 同时承担研究推理、工具循环和报告形成，用户很难理解每个配置到底影响什么。

### 2.1 当前真实入口与新环节映射

当前代码的兼容 purpose 名为 `router`；M1.0 对外统一改名为 `input`，界面环节名为 **Input**。

| # | 当前行为 | M1.0 purpose | 新环节 | 处理方式 |
|---:|---|---|---|---|
| 1 | 识别快速筛选、深度研究等研究路径 | input | Input | 继续独立短请求 |
| 2 | 提取证券名称、代码和比较意图 | input | Input | 与路径识别共用固定 Input |
| 3 | 主研究工具循环 | research | Researcher | 保持有状态工具循环 |
| 4 | 取证阶段结束后形成可交付草稿 | research | Writer | 在安全阶段边界使用冻结上下文 |
| 5 | 判断补充证据是否回答目标问题 | followup | Evidence Verifier | 使用有限主张和证据片段 |
| 6 | 最终审查及必要修复 | review | Auditor | 保持独立审查语义 |
| 7 | PDF 增强读取 | vision | Vision | 固定视觉模型 |
| 8 | 图片材料读取 | vision | Vision | 固定视觉模型 |
| 9 | 审计阶段原件复读 | vision | Vision | 固定视觉模型 |
| 10 | 定位页补读 | vision | Vision | 固定视觉模型 |
| 11 | 重复结构/语义失败后的独立关键复核 | critical-review | Critical Reviewer | 复用 V5.2 异常资格门，不再读取验收文件 |
| 12 | 重大且证据充分的 L1/L2 冲突裁决 | judge | Judge | 复用 V5.2 裁决契约，不再读取验收文件 |

`questionAnalysis`、`searchPlanning`、`dataInterpretation` 和 `reportWriting` 是用户能理解的过程名称，但当前前三项并没有独立模型调用边界。第一期不为它们再增加配置项：

- 问题分析、搜索规划、工具选择和数据解释归入 **Researcher**。
- 报告草稿生成归入 **Writer**。
- 只有当上下文已经冻结并可安全重建时，才允许 Researcher 与 Writer 使用不同模型。

### 2.2 不属于模型环节的工作

以下工作继续由程序、数据适配器或工具完成，不能因为多模型配置而迁移到自由文本推理：

| 工作 | 责任边界 |
|---|---|
| SEC、巨潮、腾讯、Tushare、Longbridge、Web Search 等数据获取 | 数据源适配器和检索工具 |
| 页面下载、PDF 解析、OCR、结构化抽取 | 文档和视觉处理管线 |
| 证券唯一身份、交易所和代码解析 | Security Resolver |
| ROIC、FCF、DCF、TSR、归一化利润等计算 | 版本化确定性程序 |
| 财务期间、币种、股本口径和估值口径校验 | 数据口径及验证模块 |
| 来源、证据、主张、反证和引用关系 | 结构化证据对象及验证器 |
| 截止日、恢复、检查点、保存和交付 | Research Lifecycle 与持久化模块 |
| 成本、缓存和调用元数据 | 独立的可观测性模块；不限制研究执行 |

## 3. 用户配置设计

### 3.1 最小配置文件

建议将普通配置升级为 schema v2。用户只需要理解 `models` 和 `pipeline`：

```json
{
  "schemaVersion": 2,
  "models": {
    "fast": {
      "model": "your-fast-model",
      "baseUrl": "https://example.com/v1",
      "apiKeyEnv": "LLM_FAST_API_KEY"
    },
    "vision": {
      "model": "your-vision-model",
      "baseUrl": "https://example.com/v1",
      "apiKeyEnv": "LLM_VISION_API_KEY"
    },
    "research": {
      "model": "your-research-model",
      "baseUrl": "https://example.com/v1",
      "apiKeyEnv": "LLM_RESEARCH_API_KEY"
    },
    "audit": {
      "model": "your-audit-model",
      "baseUrl": "https://example.com/v1",
      "apiKeyEnv": "LLM_AUDIT_API_KEY"
    },
    "flagship": {
      "model": "your-flagship-model",
      "baseUrl": "https://example.com/v1",
      "apiKeyEnv": "LLM_FLAGSHIP_API_KEY"
    }
  },
  "pipeline": {
    "input": "fast",
    "vision": "vision",
    "researcher": ["research", "flagship"],
    "writer": "research",
    "evidenceVerifier": ["research", "audit"],
    "auditor": ["audit", "flagship"],
    "criticalReviewer": ["flagship"],
    "judge": ["flagship"]
  }
}
```

配置规则：

- `models` 的键是用户定义的模型别名，不代表供应商等级。
- `pipeline` 只能引用已经定义的模型别名。
- 一个模型可以承担多个环节。
- 每个环节可以使用一个固定模型，也可以使用按优先级排列的模型池；`criticalReviewer` 和 `judge` 可以设置为空数组关闭。
- 密钥只通过环境变量名引用，配置文件不得保存密钥值。
- 业务代码只读取环节名，不读取模型名、供应商名或接口地址。
- Input 和 Vision 默认只配置一个模型；研究、撰写、核验、审计及非常规环节可以配置有序模型池。旧 MAIN/PRO、Challenger、Champion 等能力由内部兼容层表达，不再要求用户使用这些名称。
- 平台根据环节契约验证请求和响应。模型不能完成工具调用、图片输入或结构化输出时，本次任务明确失败或暂停，不自动购买试跑、不自动换模型，也不生成验收文件。

### 3.2 最简两模型部署

资源有限时可以只配置通用模型和视觉模型：

```json
{
  "schemaVersion": 2,
  "models": {
    "default": {
      "model": "your-general-model",
      "baseUrl": "https://example.com/v1",
      "apiKeyEnv": "LLM_API_KEY"
    },
    "vision": {
      "model": "your-vision-model",
      "baseUrl": "https://example.com/v1",
      "apiKeyEnv": "LLM_VISION_API_KEY"
    }
  },
  "pipeline": {
    "input": "default",
    "vision": "vision",
    "researcher": "default",
    "writer": "default",
    "evidenceVerifier": "default",
    "auditor": "default",
    "criticalReviewer": [],
    "judge": []
  }
}
```

平台不应把“配置了多个环节”解释为“必须购买多个模型”。

### 3.3 环境变量

普通环境配置只保留：

```dotenv
MODEL_CONFIG_FILE=./config/models.local.json
LLM_FAST_API_KEY=
LLM_VISION_API_KEY=
LLM_RESEARCH_API_KEY=
LLM_AUDIT_API_KEY=
LLM_FLAGSHIP_API_KEY=
```

本地和生产环境分别引用自己的模型文件和密钥：

```dotenv
# .env
MODEL_CONFIG_FILE=./config/models.local.json
```

```dotenv
# .env.production
MODEL_CONFIG_FILE=./config/models.production.json
```

生产配置可以复用同一 schema，但不得把真实密钥写入 JSON 或提交到仓库。

### 3.4 V5.1 与 V5.2 的直接接入

用户指定模型后，不再经过验收/晋级层，而是直接编译成任务可固定的内部 Profile：

- **成本**：V5.1 价格表使用编译后的 profile ID 与连接身份匹配，未知价格继续保持未知。
- **缓存**：缓存指纹继续包含模型、连接、阶段和规范化公共前缀；不同模型不得共享命中。
- **历史预算兼容**：旧任务保存的资源账本继续校验和读取，但额度不再停止调用或缩减检索；新任务不创建统一预算。
- **模型池**：用户可为任一环节指定一个或多个模型，列表顺序就是明确优先级；Input 和 Vision 建议保持单模型。
- **健康状态**：只有在尚未发起请求或到达安全阶段边界时，才能跳过冷却中的模型。
- **裁决**：模型选择方式改变，但 V5.2 的输入契约、证据充分条件、只能选择原结论或保持未决等规则不变。

用户的阶段分配属于显式人工配置，并在任务创建时保存来源和配置哈希，不是系统自动宣称某个模型质量更高。V5.1 成本数据只负责计量与展示，不阻断研究，也不自动把任务改派给更便宜的模型。

## 4. 内部架构设计

用户配置保持简单，不等于取消平台的安全约束。内部仍需保留以下层次：

```text
用户配置（models + pipeline）
          ↓
配置解析与严格校验
          ↓
阶段请求与响应契约
          ↓
阶段编译器（stage → ModelProfile）
          ↓
Model Gateway
          ↓
唯一 Provider Adapter
          ↓
模型接口
```

### 4.1 阶段编译器

新增内部 `ModelPipeline` 概念，将简单配置编译为 Gateway 已有的 `ModelProfile`：

```js
{
  schemaVersion: 1,
  stages: {
    input: { profileIds: ["..."] },
    vision: { profileIds: ["..."] },
    researcher: { profileIds: ["...", "..."] },
    writer: { profileIds: ["..."] },
    evidenceVerifier: { profileIds: ["...", "..."] },
    auditor: { profileIds: ["...", "..."] },
    criticalReviewer: { profileIds: ["..."] },
    judge: { profileIds: ["..."] }
  },
  configHash: "sha256:..."
}
```

业务模块调用 Gateway 时只声明阶段与必要能力。例如 Researcher 要求文本、流式和工具调用；Vision 要求图片输入；Input 要求文本和结构化短输出。阶段编译器负责解析实际 profile，业务模块不得自己选择供应商或模型。

### 4.2 能力与高级参数

普通配置不再出现 `capabilities` 和 `adapterOptions`，平台也不建立新的模型验收文件。能力由每个研究环节的固定契约体现：

- Input 必须返回可验证的短结构；不符合就使用已有规则回退或明确失败。
- Vision 必须接受图片并返回带定位信息的内容；不支持就保留 OCR/文本结果和材料缺口。
- Researcher 必须支持当前工具协议；无效工具参数由现有严格校验拒绝。
- Writer、Evidence Verifier、Auditor、Critical Reviewer 和 Judge 的输出均由各自现有 schema/验证器校验。
- Provider 特有参数由唯一 Adapter 处理，业务代码和用户配置不推断模型能力。
- 模型或接口无法满足环节契约时，不把失败解释为模型质量结论。现有安全升级/回退能力只有在用户已配置对应模型、完成工具结果并到达明确阶段边界时才可使用。

设置页只显示“已配置”“连接可用”“最近调用成功/失败”和具体环节错误，不显示底层能力矩阵。连接检查由用户显式触发并清楚提示可能产生一次模型请求；平台不自动进行批量或付费试跑。

### 4.3 V4.8–V5.2 保留能力与取消内容

M1.0 保留 V4.8–V5.2 的研究和模型平台能力，取消的是必须由用户手工组织的试跑、验收和多套配置流程。

| 版本 | 保留的能力 | 取消的用户负担 |
|---|---|---|
| V4.8 | Model Gateway、Adapter、能力约束、健康状态、安全切换、模型状态、隐藏推理隔离、遥测 | 单独维护 policy 验收报告与重复环境变量 |
| V4.9 | 多模态读取、Vision 独立请求、有限回退、提取身份、质量 grader、恢复保护 | Vision 批量付费试跑、promotion approval 文件和 Challenger 专用密钥组 |
| V5.0 | 统一 benchmark 数据结构、grader、统计、任务分类、对照分析、历史 Champion/A-B 记录 | 生产启用前的批量付费 comparison、人工 Champion 注册表维护、策略版本/失效文件和多套 preview/rollback 配置 |
| V5.1 | 定价、成本、缓存和调用观察；历史预算记录可读 | 成本排序试运行、统一研究预算及其两个环境变量 |
| V5.2 | 旗舰模型池、异常资格、独立上下文、关键复核、Judge 契约、确定性验证、一次性会话与用量观察 | 旗舰/Judge 的 live acceptance 报告、人工审批文件和额外准入步骤 |

统一后的原则：

- 模型在一个配置文件中定义一次，再分配给研究环节或旗舰池。
- 用户显式配置就是新任务的模型选择来源；任务创建时固定完整身份。
- Gateway 仍执行能力、请求、响应、状态和恢复约束。
- benchmark/grader/statistics 可以继续用于离线回归和历史分析，但不再是模型启用的强制前置条件。
- 不自动运行批量真实模型请求，不自动产生付费试跑。
- Champion/A-B、Challenger 和 MAIN/PRO 等既有内部能力如需保留，只作为后台实现与历史语义，不要求用户在环境文件中理解或维护。

目标普通环境中不再出现以下人工准入和重复控制项：

```text
MODEL_POLICY_ACCEPTANCE_FILE
VISION_ACCEPTANCE_FILE
MODEL_CHAMPION_REGISTRY_FILE
MODEL_CHAMPION_POLICY_VERSION
MODEL_CHAMPION_INVALIDATION_FILE
FLAGSHIP_REVIEW_ACCEPTANCE_FILE
JUDGE_ACCEPTANCE_FILE
MODEL_AB_ENABLED
MODEL_CHAMPION_ENABLED
FEATURE_VISION_ROUTING
FEATURE_COST_ROUTER
```

`MODEL_ROUTING_MODE`、MAIN/PRO/Challenger 等内部概念不再作为普通用户必填项。M1.0 的阶段配置编译器可以在内部复用现有分层、健康和安全切换能力。Critical Reviewer 与 Judge 是否启用直接由其模型池是否为空决定，无需再维护额外环境开关和验收文件。

历史发布说明、模型状态、比较结果和调用记录不会删除或改写。

### 4.4 配置与准入流程清理清单

实施时重构入口，不删除仍承载研究能力的模块：

| 区域 | M1.0 处理 |
|---|---|
| `server/model-policy.mjs`、`server/research-complexity.mjs`、`server/model-escalation.mjs` | 保留策略判断和安全阶段切换能力，改为消费阶段配置，不读取人工验收文件 |
| `server/model-champion.mjs`、`server/model-experiment.mjs`、`server/model-drift.mjs` | 保留离线分析、历史状态和漂移观察；取消生产启用必须维护的注册表/版本/失效文件链 |
| `server/vision-policy.mjs` | 保留 Vision 选择、回退、身份和安全约束；取消 live comparison admission 与 acceptance 文件 |
| `server/model-rollout.mjs` | 保留新任务固定、恢复保护和公开状态；取消所有 acceptance-file gate |
| `server/model-catalog.mjs`、`server/model-config.mjs`、`server/model-connection.mjs` | 改为模型定义一次、阶段多处引用；去掉专用角色的重复凭据和普通用户能力矩阵 |
| `server/model-gateway.mjs` | 保留 Gateway、健康、遥测、费用和历史预算恢复能力；路由来源改为阶段编译结果 |
| `benchmark/*` 与相关脚本 | 保留离线夹具、grader、统计与历史分析；删除默认批量真实模型请求和生产晋级导出流程 |
| `package.json` | 保留离线回归、成本、Vision 与 Judge 合约测试；删除容易触发付费批量试跑的普通入口 |
| `.env*` 与 `config/models*.json` | 只保留模型文件路径和被模型条目引用的密钥；删除重复角色变量、验收文件变量、preview/rollback 常态副本 |
| 前端与配置文档 | 保留模型状态、费用、缓存和异常复核说明；取消预算、试跑、验收、Champion/A-B 配置流程 |

任何模块只有在确认不再承载上述保留能力、历史状态解析或恢复保障后才可删除。测试应改为验证简化后的契约，不能通过删除测试削弱证据、恢复或审计要求。

## 5. 各环节输入、输出与状态边界

| 环节 | 输入 | 输出 | 是否有状态 | 禁止事项 |
|---|---|---|---|---|
| Input | 用户问题、少量会话上下文 | 研究路径、证券意图、置信和缺口 | 否 | 调工具、生成研究结论 |
| Vision | 原始页图、页码、指定提取目标 | 带页码和区域来源的未验证提取 | 否 | 把读不到的值补成估计值 |
| Researcher | 公共研究计划、已取证据、工具结果 | 工具调用、分析草稿、待验证主张 | 是，限本环节 | 写入隐藏推理、跨模型传递私有 continuation |
| Writer | 冻结后的公开研究上下文、计算结果、引用 | 报告草稿 | 否 | 发起新的无记录检索、改变事实口径 |
| Evidence Verifier | 目标主张、有限候选证据、来源信息 | 支持/不支持/不确定及原因 | 否 | 把相关性当成事实证明 |
| Auditor | 报告、结构化证据、计算记录、反证、视觉复核结果 | 审核问题、修复建议、合格状态 | 独立审查轮次 | 访问 Researcher 隐藏推理、隐式更换历史事实 |
| Critical Reviewer | 完整公开上下文、重复且已验证的结构/语义失败 | 独立复核结果 | 每任务至多一次 | 因数据缺失、供应商故障或普通任务触发 |
| Judge | 已完成的 L1/L2 结论、证据和工具结果 | 选择原结论之一或证据不足 | 每任务至多一次 | 创造第三种事实、替代原有验证 |

所有跨环节传递只使用可保存、可复查的公共对象。隐藏推理不保存、不显示，也不跨模型迁移。

## 6. 完整输入到输出流程

```text
用户输入
  → Input：识别研究路径与证券意图
  → 创建研究任务：固定截止日、Knowledge 版本和模型管线
  → 形成公开研究计划
  → Researcher：分析问题并选择工具
  → 数据源/搜索工具：获取原始材料
  → 解析/OCR/Vision：形成带来源的候选材料
  → 证据与事实验证：保留缺失、冲突和反证
  → 确定性计算：财务指标、现金流、估值和敏感性
  → Researcher：解释证据与计算、继续补充检索
  → Evidence Verifier：验证关键补充证据是否有效
  → Writer：基于冻结上下文生成报告草稿
  → Auditor：独立审查引用、事实、反证、口径和交付完整性
  → Critical Reviewer（仅异常触发）：处理重复且已验证的结构/语义失败
  → Judge（仅重大冲突触发）：在两个已完成结论间裁决或保持未决
  → 确定性验证器：执行硬规则校验
  → 保存结构化研究对象、检查点和报告视图
  → 输出页面、PDF 或导出文件
```

检查点与恢复贯穿全过程。恢复任务必须使用原始市场/数据截止日和已经固定的模型管线，除非用户明确创建一个新的研究任务。

每次模型调用统一接入 V5.1 的用量、费用和缓存记录；缓存只统计实际可复用的相同前缀。Critical Reviewer 和 Judge 使用同一记录口径，不建立预算或“试跑预算”。

## 7. 模型切换规则

为了避免工具调用损坏、推理串线和历史任务漂移，模型只能在明确阶段边界切换：

1. Input 完成后可进入 Researcher。
2. Researcher 必须完成所有待返回工具结果，才能结束该阶段。
3. Writer 只接收重新构建的公共上下文，不接收 Researcher 的私有 continuation。
4. Auditor 使用独立上下文，不接收 Writer 的隐藏推理。
5. 同一阶段内不因缺少数据、低置信或财务校验失败而自动升级模型。
6. 已返回部分内容或已经发出工具调用时，禁止换模型重放。
7. 模型不可用时，任务暂停并保存检查点；只有兼容的既定模型恢复后才能继续。
8. 所有模型池按用户配置顺序选取；健康状态可以跳过尚未开始调用的不可用模型，但不得在响应开始后重放到下一个模型。

模型池复用 V4.8–V5.2 已有的健康、分层和安全切换能力，但不要求批量付费试跑或人工验收文件。缺少数据、低置信、普通校验失败和已开始的响应仍不能触发无边界重放。

## 8. 持久化与恢复

新任务建议新增 `modelState` v4，采用加法迁移：

```json
{
  "version": 4,
  "pipelineVersion": 1,
  "configHash": "sha256:...",
  "stages": {
    "input": [{ "profileId": "...", "model": "...", "connectionIdentity": "..." }],
    "vision": [{ "profileId": "...", "model": "...", "connectionIdentity": "..." }],
    "researcher": [{ "profileId": "...", "model": "...", "connectionIdentity": "..." }],
    "writer": [{ "profileId": "...", "model": "...", "connectionIdentity": "..." }],
    "evidenceVerifier": [{ "profileId": "...", "model": "...", "connectionIdentity": "..." }],
    "auditor": [{ "profileId": "...", "model": "...", "connectionIdentity": "..." }],
    "criticalReviewer": [{ "profileId": "...", "model": "...", "connectionIdentity": "..." }],
    "judge": [{ "profileId": "...", "model": "...", "connectionIdentity": "..." }]
  }
}
```

约束：

- 不保存密钥、提示词、隐藏推理或原始图片。
- 新建任务时固定完整阶段映射和接口身份。
- 配置文件后续改变不影响已创建任务。
- 旧 v1/v2/v3 `modelState` 继续原样读取，不批量改写。
- V5.2 旗舰状态的新写入改为直接配置快照，不再写 acceptance file hash；既有 v1 旗舰授权收据只读兼容。
- 旧状态缺失字段不能被伪造为已知值。
- 不兼容的恢复请求在发起新模型调用或重新取数前暂停。
- 密钥轮换可保持同一连接身份；模型或接口身份改变视为不兼容。

## 9. 兼容迁移策略

遵循“新增 → 双读 → 新写 → 验证 → 切换 → 后续清理”。

### 阶段 A：冻结现状与建立基线

- 固定当前 10 个普通研究入口和 2 个 V5.2 非常规入口清单。
- 保留“所有生产调用必须经过 Model Gateway”的架构测试。
- 记录六种研究路径和现有请求/结果/事件/检查点黄金样本。
- 不改变现有运行配置和任务状态。

### 阶段 B：退役付费试跑与模型验收层

- 删除 policy、Vision、Champion、Flagship 和 Judge 对 acceptance 文件的运行依赖。
- 删除默认可触发批量真实请求的 comparison/benchmark 入口和生产晋级导出流程。
- 保留 Gateway 分层、安全阶段切换、Vision 回退、benchmark 数据结构、grader/statistics、历史实验状态和 drift 观察能力。
- 把旧 MAIN/PRO/Challenger/Champion 配置编译成内部兼容策略，不再要求用户维护相应开关、注册表和多组密钥变量。
- 保留离线确定性回归夹具、Vision/Judge 合约测试、成本统计和恢复测试。
- 先检查数据库中的 v2/v3 和旧旗舰授权任务，保证它们仍按原固定身份恢复；不能为了简化配置重绑模型。

### 阶段 C：增加 schema v2 解析器与编译器

- 新增 v2 配置验证，但继续支持 v1。
- 将 v2 编译成现有 Gateway 可消费的内部 Profile/Catalog。
- 增加阶段契约及必要能力校验。
- 此阶段只做离线解析和测试，不切换生产调用。

### 阶段 D：建立旧配置兼容映射

| 旧配置角色 | 新环节 |
|---|---|
| `legacy-router` / `router` | `input` / Input |
| `legacy-vision` / `vision` | Vision |
| `legacy-analysis` / `defaultResearch` | Researcher、Writer、Evidence Verifier、Auditor |
| `flagshipReview` | Critical Reviewer 模型池第一项 |
| `flagshipJudge` | Judge 模型池第一项 |
| `policyMain` / `policyPro` / Challenger / Champion | 转换为内部兼容模型和策略；不再作为普通用户概念，历史任务仍按原快照读取 |

旧配置在内存中转换，不修改原文件，不回写历史任务。

### 阶段 E：按安全边界拆分调用语义

- 将主研究工具循环明确标记为 Researcher。
- 将研究结束时的草稿统一到 Writer 上下文构建器。
- 将 followup 改名并绑定 Evidence Verifier。
- 将 final review/repair 绑定 Auditor。
- 四个 Vision 使用点仍共用一个 Vision 环节。
- 两个旧 `router` 使用点迁移后共用一个 Input 环节。
- 关键复核和 Judge 复用 V5.2 的独立上下文、资格判断和严格输出验证，只替换模型准入来源。

若某个流程无法重建完整公共上下文，则该流程继续使用 Researcher，不为了“角色齐全”强行拆分。

### 阶段 F：新增 modelState v4

- 新任务写 v4 阶段快照。
- 旧任务继续读 v1/v2/v3。
- 检查点保存当前环节和已完成的公共输出。
- 重启、重试和人工恢复均验证阶段身份与截止日。

### 阶段 G：离线回归与同模型对照

- 对同一固定模型比较旧 `purpose` 与新阶段编译结果。
- 请求、工具调用、公开输出、证据、事件和检查点应保持等价。
- 默认只使用录制夹具、模拟 Adapter 和现有结果，不运行批量真实模型请求。
- 用户显式点击连接检查时最多执行一次最小请求，并在执行前显示可能产生的费用；该结果只表示连接是否可用，不形成模型验收或晋级结论。
- 差异必须归类为预期阶段拆分或回归缺陷。

### 阶段 H：新任务切换

- `MODEL_CONFIG_FILE` 指向 schema v2 文件时，新任务写入 modelState v4；无需额外功能开关。
- schema v1 配置继续生成旧状态，旧任务按原模型状态继续。
- 观察期内保留 v1 配置解析和旧状态读取。
- 普通示例和 UI 不再展示旧高级入口；不再等待付费试跑或人工模型验收。

### 阶段 I：后续清理

- 清理必须放在独立后续版本。
- 只有在不存在活动旧任务、备份验证完成且回滚窗口结束后，才能删除旧写入路径。
- 历史模型状态、审批记录和审计记录不得删除或重写。

## 10. 前端交互方案

设置页分为两个区域：

### 10.1 可用模型

每张模型卡只显示：

- 自定义名称
- 模型 ID
- 接口状态
- 密钥是否已配置
- 已分配研究环节和最近一次运行状态

编辑项只包含模型 ID、接口地址和密钥环境变量名。高级能力详情以只读方式放在“诊断信息”中。

### 10.2 研究流程分配

使用一张六行表格：

| 研究环节 | 当前模型 | 状态 | 操作 |
|---|---|---|---|
| 路径与证券识别 | fast | 已配置 | 更换 |
| 图片与 PDF 读取 | vision | 已配置 | 更换 |
| 研究与工具使用 | research | 已配置 | 更换 |
| 报告撰写 | research | 已配置 | 更换 |
| 证据核验 | research | 已配置 | 更换 |
| 最终审计 | audit | 已配置 | 更换 |
| 异常关键复核 | flagship | 可选开启 | 管理模型池 |
| 重大证据冲突裁决 | flagship | 可选开启 | 管理模型池 |

选择模型时列出用户已经配置的模型，并说明该环节要求。保存前执行静态配置检查并展示受影响的**新任务**；已存在任务显示“保持原配置”。实际请求和输出仍由环节契约严格验证。

页面不出现 `MAIN / PRO`、Challenger、Champion、A/B、预算、验收文件、策略文件路径和内部版本号。诊断页只提供配置检查、连接检查、最近错误、费用和缓存信息，不提供付费批量试跑或模型晋级。

## 11. API 与代码落点建议

以下文件名为实施建议，实施前仍需先复用现有模块并按当前代码调整：

| 责任 | 建议处理 |
|---|---|
| 配置读取 | 扩展 `server/model-config.mjs`，双读 schema v1/v2 |
| Profile/Catalog | 扩展 `server/model-catalog.mjs`，由阶段编译器生成内部 Profile |
| 阶段映射 | 新增小型 `server/model-pipeline.mjs`，只做纯数据编译和校验 |
| Gateway 路由 | 扩展 `server/model-gateway.mjs` 接受内部阶段，不接受业务模型名 |
| 研究调用 | 在 `server/agent.mjs` 内按现有调用边界标记 Researcher/Writer/Verifier/Auditor |
| 路由调用 | 复用 `server/research-path.mjs`、`server/security-intent.mjs` |
| Vision | 复用 `server/vision-model.mjs` 和现有视觉读取模块 |
| 状态 | 扩展 `server/model-state.mjs`，增加 v4，保留 v1/v2/v3 |
| 恢复 | 扩展现有 create/resume/retry/checkpoint owner，不建第二套恢复系统 |
| 成本/缓存 | 直接复用 `server/model-pricing.mjs`、`server/model-cache.mjs` 和现有 ModelCall 汇总；`server/research-budget.mjs` 仅保留历史恢复兼容 |
| 旗舰/裁决 | 复用 `server/model-flagship.mjs`、`server/model-judge.mjs` 的资格、上下文、会话和验证逻辑，移除 acceptance/rollout 依赖 |
| 策略兼容 | 复用 policy/champion/experiment/drift/Challenger 的安全逻辑和历史语义；输入改为阶段配置，取消独立验收/注册表配置链 |
| 配置 API | 只返回安全摘要和环节状态，不返回地址、密钥或策略内部文件 |
| 前端 | 将模型设置改为“可用模型 + 研究流程分配”两块 |

不得创建第二个 Gateway、第二套 Provider transport 或平行研究编排器。

## 12. 测试与验收标准

### 12.1 配置测试

- schema v2 正常解析、严格拒绝未知字段和重复键。
- 模型别名、环境变量名、URL 和引用关系均严格验证。
- 配置错误不泄露密钥、URL 凭据或原始异常。
- v1 配置与旧环境变量保持兼容。
- v2 不接受验收文件、Champion/A-B、Challenger 或 provider 特有策略参数。
- Critical Reviewer/Judge 模型池为空时明确关闭，非空时按用户顺序解析。

### 12.2 架构测试

- 生产模型请求仍只有一个 Gateway Adapter 出口。
- 业务模块不得出现模型名、供应商 endpoint 或直接网络调用。
- 10 个普通研究入口与 2 个 V5.2 非常规入口必须全部登记；新增入口必须先声明阶段。
- 搜索执行、财务计算和硬校验不得调用自由模型替代确定性程序。
- 生产代码不得读取 acceptance 文件或重复的 Champion/A-B/Challenger 环境变量；内部能力只能读取编译后的阶段配置和任务快照。

### 12.3 行为回归

- 六种研究路径的任务创建、执行、交付和错误语义保持一致。
- Input 的两个入口行为保持一致，并兼容旧 `router` 调用。
- Vision 的四类输入保持页码、区域、哈希和未验证标识。
- Researcher 工具调用与工具返回保持原子配对。
- Evidence Verifier 不能把未回答的片段判为支持。
- Auditor 仍能发现引用、计算、缺口和反证问题。
- Critical Reviewer 仍只能由 V5.2 的重复已验证失败条件触发。
- Judge 仍只能在证据充分的重大 L1/L2 冲突中选择原结论或保持未决。
- 缺少数据不会触发自动升级或填造数值。

### 12.4 恢复与兼容

- v1/v2/v3 历史任务可读、可按原状态恢复。
- v4 新任务在进程重启后保持相同阶段模型和连接身份。
- 配置更新不改变已创建任务。
- 不兼容模型、连接或认证变化在任何新调用/取数前暂停。
- 研究截止日、证据来源和检查点不因模型拆分变化。

### 12.5 安全与隐私

- API、日志、前端、报告和导出中无密钥。
- 隐藏推理不进入事件、检查点、遥测或跨环节上下文。
- 遥测只记录阶段、模型身份、使用量、耗时、成本和安全错误分类。
- 原始图片和完整提示词不写入模型调用遥测。

### 12.6 完成定义

必须同时满足以下条件才可默认启用：

1. 全量相关测试和新增阶段测试通过；旧验收测试只可在明确的契约退役中替换，不能通过削弱证据/恢复/验证要求来消除失败。
2. 12 个模型入口清单无未登记绕过。
3. v1/v2 配置双读及 v1/v2/v3/v4 状态恢复通过。
4. 固定同模型回归的请求、公开输出、事件和检查点差异均已解释。
5. 至少完成一次真实进程退出/启动后的 Mongo 恢复测试。
6. 普通 UI 不再要求用户理解高级发布治理概念。
7. 配置、运行、恢复和回滚手册完成。
8. V5.1 成本/缓存、历史预算兼容以及 V5.2 关键复核/Judge 的集成回归通过。

## 13. 回滚方案

- 关闭 `MODEL_PIPELINE_V2_ENABLED`，新任务恢复使用旧配置路径。
- 已存在 v4 任务暂停，不能静默改绑旧模型；恢复兼容运行版本后继续。
- v1 配置解析、v1/v2/v3 状态读取和旧任务执行路径在观察期保留。
- 不删除或回写 v4 状态、模型调用记录、证据和审计历史。
- 若新 UI 出现问题，可恢复旧配置 UI；后端 v2 文件保持只读，不影响旧路径。
- 数据库采用加法字段，无需破坏性降级迁移。

## 14. 风险与控制

| 风险 | 控制措施 |
|---|---|
| 用户把不兼容模型分配给某个环节 | 固定请求/响应契约严格校验，失败明确且不自动切换 |
| Writer 与 Researcher 分开后丢失上下文 | 仅传递冻结公共上下文；信息不足时继续复用 Researcher |
| 旧任务被新配置改变 | 创建时固定完整 stage map 和连接身份 |
| 模型切换导致工具调用断裂 | 只允许在无待处理工具调用的阶段边界切换 |
| 多模型增加成本 | 普通路径默认复用 4 个模型，可选旗舰池再增加 1 个；费用完整记录并由用户按需查看 |
| 删除验收入口后无法追溯旧任务 | 保留历史模型状态、approval hash、调用记录和发布文档的只读解析 |
| 旗舰池被误用于普通研究 | 保留 V5.2 确定性异常资格和一次调用限制 |
| 阶段命名诱导业务逻辑依赖模型 | 业务只声明阶段和能力，实际身份始终由 Gateway 解析 |

## 15. 建议实施顺序与交付物

本方案登记为 V5.2 之后的独立模型轨道 M1.0，按以下顺序实施。核心版本 V5.3 仍归 Knowledge Engineering，不重新编号既有路线图：

| 顺序 | 交付物 | 可验收结果 |
|---:|---|---|
| 1 | 12 个调用入口和黄金回归基线 | 普通与 V5.2 非常规入口可自动核对 |
| 2 | 活动历史状态盘点与兼容计划 | v2/v3/旧旗舰任务不会因移除验收配置而失联 |
| 3 | 付费试跑与人工验收依赖退役 | 新任务不再读取相关开关、注册表或 acceptance 文件，既有模型能力保留 |
| 4 | schema v2、解析器和阶段编译器 | 用户可自行指定模型和环节，配置可离线校验 |
| 5 | v1 兼容转换 | 旧基础/旗舰角色得到等价的新阶段映射 |
| 6 | Researcher/Writer/Verifier/Auditor 安全边界 | 每次跨模型只使用可保存公共上下文 |
| 7 | V5.1 + V5.2 集成 | 所有阶段统一记录费用/缓存；旗舰池继续按异常资格和裁决契约运行 |
| 8 | modelState v4 与恢复 | 新旧任务跨进程恢复通过 |
| 9 | 新配置 API 和设置页 | 用户只操作模型清单、普通环节和可选旗舰池 |
| 10 | 离线回归及受控启用 | 新任务可通过开关启用，旧任务不变，无付费批量试跑 |
| 11 | 独立后续清理 | 观察期后删除废弃配置解析和付费试跑入口，能力模块与历史读取保留 |

## 16. 实施状态

| 项目 | 结果 |
|---|---|
| 发布/子版本 | V5.2 之后的独立模型轨道 M1.0，运行时实现完成，核心版本指针仍为 V5.2 |
| 架构变化 | schema v2 编译为现有 Gateway Profile；业务调用改用阶段，未新增 Gateway 或 Provider transport |
| Schema 变化 | 新增模型配置 v2 和私有 modelState v4；旧版本继续双读 |
| 环境变化 | 当前示例移除 MAIN/PRO、Challenger、Champion/A-B、acceptance 与研究预算配置链；只保留 V5.1 价格入口 |
| 兼容影响 | schema v1 与 modelState v1-v3 保留；旧任务在缓存和遥测中继续使用旧 purpose，历史预算账本只读兼容 |
| Feature Flag | 无新增迁移开关；配置 schema 决定新任务写入版本，可选池为空即关闭对应能力 |
| Benchmark | 离线 grader/statistics 与历史记录保留；当前激活路径不再要求付费批量试跑或人工晋级 |
| 后续清理 | 观察期后再评估删除旧写入与显式 live-comparison CLI；不得删除历史状态和发布证据 |
