# V4.9 视觉对照与晋升操作说明

**当前：用户已正式批准第九批次验收，基线与候选均 48/48，当前配置准入检查通过。** 见 [正式批准记录](vision-operator-approval-20260911.md)。正式批准文件已生成，生产路由仍关闭；下方为历史批次。

## 历史验收阶段

**批准前审核：** 输出约束修正后的候选真实复验 48/48，逐图技术审核和回滚已完成，当时正式操作人批准待确认。见 [审核报告](vision-output-constraints-review-20260911.md)。批准草稿不可激活路由。

**早期完整批次：** 独立 Coding 接口对照完成 96 次调用，候选 46/48、基线 41/48，当时未通过晋升门槛；脚注标记差异与完整结果见 [本轮记录](vision-live-coding-acceptance-20260911.md)。

**早期暂停（2026-09-11）：** 用户曾因智谱余额／资源不足要求暂停真实验收；该阶段的恢复条件和结果不明请求见 [暂停记录](vision-live-acceptance-paused-20260911.md)。这些部分结果不作为批准证据。

默认生产保持 legacy。新增付费对照和生产启用须按用户明确授权执行；模拟结果不能替代真实质量证据。

## 冻结输入与离线验证

tests/fixtures/vision-benchmark/ 保存 48 个独立合成原件和 manifest；数值不来自真实发行人。脚本对原件哈希逐项校验；固定 corpus digest 对解析后的 JSON 以 UTF-8/LF 编码计算，避免 Windows 换行差异。PDF 只有栅格图片，没有可直接提取的答案文字层。构建器仅用于显式重建，新语料须重新审核及更新版本／指纹，不能覆盖已验收基线冒充同一语料。

```text
node scripts/vision-benchmark.mjs --out artifacts/vision-offline-new.json
```

输出 measurement=simulated、qualityAccepted=false；模拟服务返回参考答案只验证生产渲染、请求、归一化和 grader 的链路。报告不含密钥、原始 base64 或隐藏推理。每侧用量由现有 summarizeModelCalls 统计，未收到的用量与账单保留未知，不写零。

## 配置真实候选

使用 .env.example 中 LLM_VISION_CHALLENGER_* 配置独立服务地址、密钥、不透明型号和可选已知 provider；INPUT=images 是操作人对服务支持图片的显式声明，不是型号自动认证。THINKING=omit 为默认，只有已验证兼容服务才设 disabled。基线仍使用既有 LLM_VISION_*。不要把密钥放入模型名、URL 或报告。

完成真实候选选择和调用预算后才运行：

```text
node --env-file-if-exists=.env scripts/vision-benchmark.mjs --live --allow-paid --max-requests 96 --out artifacts/vision-live-new.json
```

48 原件 × 2 模型为 96 次请求；每次最多 6000 输出 tokens。--max-requests 是请求数硬限额，不是货币账单硬限额；输入图像、供应商定价与计费不可由此推算。真实费用须按已选服务核对。脚本不读生产数据库，不创建研究任务；只外发固定合成图像和统一读取指令，不发送参考答案。总流程上限一小时，单模型调用仍受 60 秒 deadline 约束。

新输出存在即拒绝，禁止覆盖历史运行。CLI 对输出使用独占 .lock 文件，首次保存完整运行标识；每次请求先持久保存 reserved 记录，再发出请求，收到成功／失败后立即保存结果与用量。采用临时文件、fsync 与原子重命名；Windows 不支持目录 fsync，断电保证仍取决于底层文件系统。completed 仅表示流程结束，qualityAccepted 始终为 false，须另行质量审核。

渲染异常、取消或正常中断会保留已完成结果。使用同一输出和同一请求上限显式续跑：

```text
node --env-file-if-exists=.env scripts/vision-benchmark.mjs --live --allow-paid --max-requests 96 --resume --out artifacts/vision-live-new.json
```

续跑校验语料、配置、代码、进度校验和、调用顺序以及跨重启累计请求数；已完成调用（含已记录失败）不会重放。部分完成案例重新渲染时还需匹配之前的图片身份。若保留 reserved 而没有结果，说明可能已经计费，程序拒绝自动重放或跳过。不要修改账本；保留现场并核实供应商调用记录，再单独安排后续预算／新运行。鉴权或配置失败会停止，避免继续发出整轮无效请求。

进程被强制终止时可能留下 .lock。先检查锁中的 PID，确认拥有者已停止，再移除该输出对应的单个锁文件；运行中的锁不能删除。去掉旧锁不会绕过结果不明的请求保护。旧版没有 progress 的比较报告仍作为历史证据保留，不能用于新续跑；本次代码更新也会使旧批准绑定失效，须重新验收。

请在包含冻结夹具的完整检出目录运行比较；生产镜像未包含 tests。若使用 .env.production，可把命令中的环境文件改为该文件。正式晋升前，将人工批准 JSON 只读挂载到容器可读路径，VISION_ACCEPTANCE_FILE 填该容器路径。当前 compose.production.yaml 只挂载 visual_attachments，环境模板中的 ./vision_acceptance_file/... 不会自动进入容器；仅设置文件路径不等于完成挂载。部署配置须显式加入只读批准文件挂载，并以运行用户验证可读和准入通过后再启用。默认关闭开关时不依赖该文件。

## 审核与批准

逐项对照可见图片与两侧响应，确认数值、负号、括号、单位、期间、表头、脚注、空白和行列关系；评估英文合成语料之外的真实应用限制。不能因更便宜或更快补偿关键错误。对照文件中的自带 grade 仅便于审阅，服务器会对实际 text 重新评分。

批准文件为 JSON 对象 {comparison,approval}，comparison 是完整原始真实比较报告。approval 包含 reportHash（comparison 经 JSON.stringify 的 UTF-8 SHA-256）、approvedBy、approvedAt、visualReviewPassed=true、rollbackVerified=true。批准时间不得早于比较时间。它是可信操作人的文件见证，不是独立签名服务；不要批准测试夹具生成的报告。

```text
VISION_ACCEPTANCE_FILE=/controlled/path/vision-acceptance.json
FEATURE_VISION_ROUTING=true
```

完整性、语料、模型／连接／能力／代码、逐项质量或人工见证不符时自动保留 legacy。配置存在不表示已经通过。更改相关代码／配置后必须重新取得匹配证据。新任务固定实际视觉身份；原 legacy 任务和历史无 modelState 的任务不被追溯切换。

准入校验缓存以批准文件身份／元数据、配置绑定和源码身份为条件；文件替换、相关配置／源码变更、失去凭据或关闭开关都会重新核对或保持 legacy。状态接口展示当前上下文选定的 Vision 型号；已有任务仍展示其保存的模型身份。独立调用发生 fallback 时，实际使用身份以 canonical extraction 结果为准，不能把配置状态当作每次调用事实。

## 回滚

停止当前应用实例后执行 pnpm start:legacy，强制文本与视觉均为 legacy；或关闭 FEATURE_VISION_ROUTING 并按现有运维方式重启。保留所有批准文件、比较记录、归档、job/checkpoint。已保存 candidate pin 的任务暂停，恢复相同准入后方可续跑，不自动换回另一个模型。无需数据库降级或删除数据。
