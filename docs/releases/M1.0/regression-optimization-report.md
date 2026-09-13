# V5.1、V5.2、M1.0 整体回归与优化报告

日期：2026-09-13。核心发布指针为 V5.2，M1.0 是并行模型配置轨道；运行框架/Knowledge 仍为 Turnado V4.7。本轮验证当前共享工作区中的 V5.1、V5.2 与 M1.0 完整实现，保留此前未提交改动，不发布生产。

**工程回归结论：通过。** 最终全量单元 939/939、统一发布专项 164/164、相关域 55/55、真实 Mongo/API/恢复 22/22、路由 5/5、正式构建页面 338/338，生产构建、隔离部署、备份/回滚和四组离线评测全部通过。真实模型质量、真实成本收益与生产启用不由本轮离线验证推断。

原始日志、结果 JSON、构建和截图保存在 `artifacts/v51-v52-m10-regression-20260913/`。

## 发现与优化

### 统一发布门禁遗漏 M1.0 核心测试

`pnpm test:release` 已覆盖 V5.1 的价格/用量/费用/缓存/历史预算兼容，以及 V5.2 的关键复核、旗舰状态和 Judge，但没有执行 M1.0 的 schema v2 配置编译与八环节管线测试。M1.0 交付报告把统一发布检查列为验收入口，这一遗漏会使配置或阶段固定选择的回归只在全量测试中暴露。

本轮先在 Harness 增加发布入口覆盖约束，复现 `tests/model-config.test.mjs` 未包含的失败；随后把 `model-config.test.mjs` 和 `model-pipeline.test.mjs` 纳入 `test:release`。发布专项由 142 项扩展为 164 项并全部通过，其中包含新增的 M1.0 清单约束。约束能够识别显式文件和现有通配符，后续删除三个版本的关键测试会在发布入口自身失败。

### M1.0 发布记录未进入打包清单

M1.0 的 README、工程/前端交付、迁移和回滚文档已存在，但 `MANIFEST.json` 没有任何 `docs/releases/M1.0/` 条目，因此既有精确字节/哈希检查不会覆盖该轨道。本轮先增加清单覆盖测试并复现缺失，再把五份既有发布记录和本报告加入清单。清单继续使用精确字节数与 SHA-256；以后文档缺失、变更未同步或重复登记都会由 Harness 拒绝。

### 320px 资料重试进度条越界

正式构建的首轮完整页面回归为 337/338，唯一失败是 320px 资料单项重试加载态。共享 Progress 指示层使用完整宽度加位移表示百分比，浏览器虽然由外层裁切，子元素几何范围仍超出卡片边界，违反移动端无横向溢出的界面契约。

本轮把指示层改为 0–100% 限幅后的实际宽度，并只过渡宽度属性。320px 与 1440px 定向复测 2/2 通过，随后同一修复构建的完整页面回归 338/338 通过；视觉抽查确认资料上传、处理结果和底部操作区在窄屏下保持完整。

### 回归运行一致性

首轮页面运行期间，前端组件和对应测试由共享工作区的其他改动同时更新。测试文件修改时间晚于被测构建，新断言因此运行在旧构建上，产生 Toggle/Radio 组件形状不一致。该混合快照结果不计为产品失败；停止后以稳定源码重新构建，13 个受影响场景定向复测全部通过，再运行完整正式构建页面回归。

数据库第一次准备时 27029 隔离服务尚未启动，连接在任何产品断言前被拒绝；启动一次性 Mongo 后重跑。M1.0 配置恢复测试要求专用 `MODEL_CONFIG_TEST_MONGODB_URI`，不接受普通数据库变量；按其安全契约单独传入隔离地址后 3/3 通过。以上均未通过放宽超时、断言或隔离要求来取得通过结果。

Docker 首轮从 CLI 容器内创建 `/tmp` 工作区，外层 Docker Desktop daemon 无法看到其中的模型配置绑定，部署套件按预期失败并清理资源。最终运行改用 daemon 可见、仅属于本轮工件的共享临时目录，原部署脚本及故障注入断言不变。

## 验证矩阵

| 检查 | 最终结果 | 证据 |
| --- | --- | --- |
| 初始全量单元 | 937/937 | unit-initial.log |
| 优化后全量单元 | 939/939，0 失败/取消/跳过 | unit-final.log |
| 发布专项 | 初始 142/142；加入 M1.0 运行测试后 163/163；最终 164/164 | release-initial.log、release-after-fix.log、release-final.log |
| 发布覆盖红绿测试 | 修复前明确缺少 model-config；修复后由发布专项覆盖 | release-coverage-before-fix-2.log、release-after-fix.log |
| M1.0 打包清单红绿测试 | 修复前明确缺少 M1.0 README；最终由 Harness 覆盖 | m10-manifest-before-fix.log、harness-final.log |
| 三版本相关域 | 55/55 | domain-initial.log |
| Mongo/API/恢复 | 14 个既有组 19/19；M1.0 配置恢复 3/3 | mongodb-results.json、mongo-*.log、mongo-model-config-final.log |
| 路由渲染 | 5/5 | routes-initial.log、routes-final.log |
| 本地/生产模型配置 | 两套均为 schema v2、2 个模型、8 个环节、凭据就绪，付费调用 0 | model-config-local.log、model-config-production.log |
| 生产构建 | 通过；入口 484.88 kB / gzip 160.77 kB | build-fixed.log、build-fixed/ |
| 页面受影响场景 | 13/13 | ui-focused.log、ui-focused-exit.json |
| 进度条修复定向页面 | 2/2（320px、1440px） | ui-retry.log、ui-retry-exit.json |
| 完整正式构建页面 | 338/338，production assets，耗时 627728 ms | ui-fixed.log、ui-fixed-exit.json、ui-fixed/ui-results.json |
| Linux 部署、备份与回滚 | 全部通过，退出 0 | deploy-final.log、deploy-final-exit.txt |
| 文本/Vision 离线评测 | 32/32、192/192，simulation，qualityAccepted=false | benchmark-text/summary.json、benchmark-vision/summary.json |
| 费用/Judge 固定评测 | 6/6、12/12；模型请求 0 | cost-benchmark.json、judge-benchmark.json |
| 差异格式与最终摘要 | 通过；结构化摘要已生成 | diff-check-final.log、completion.json |

## 兼容性与边界

本轮后端运行代码仅改变统一测试入口；前端共享 Progress 组件将指示层从位移完整宽度改为 0–100% 的受限实际宽度。模型配置 schema、Gateway/Adapter、价格和费用公式、缓存资格、历史预算账本、旗舰/Judge 资格、研究证据、财务计算及 HTTP API 均未改变。新任务仍固定 modelState v4 的八环节身份；schema v1 与 modelState v1-v3 历史任务继续使用原身份、截止时间和恢复路径。

没有修改实际模型配置、密钥或生产数据库。两套配置检查只验证本地文件等价性，不调用模型、不输出密钥。离线评测均为合成/冻结工程证据，不能证明真实模型质量、节省比例、关键复核价值或线上吞吐。价格未知继续保持未知；模拟结果不能启用候选、旗舰或自动模型替换。

完整浏览器测试使用内存 API 夹具。数据库使用一次性 27029 Mongo 容器和随机数据库；部署使用一次性项目、容器、卷和网络。首轮无效页面/数据库/部署日志保留，最终结论只引用同一源码和正确隔离前提下的重跑结果。

## 18 项交付记录

| 项目 | 本轮记录 |
| --- | --- |
| 1. Release / subrelease | V5.1、V5.2 与独立 M1.0 轨道整体工程回归；维护跨版本发布门禁 |
| 2. Modified files | `package.json`、`tests/harness.test.mjs`、`src/components/ui/progress.jsx`、`docs/releases/V5.1/DETAILED_INDEX.md`、`docs/releases/V5.2/DETAILED_INDEX.md`、`docs/releases/M1.0/README.md`、`MANIFEST.json` |
| 3. New files | 本报告；验证工件位于 `artifacts/v51-v52-m10-regression-20260913/` |
| 4. Removed files | 无 |
| 5. Architecture changes | 无运行架构变化；统一门禁增加 M1.0 配置与管线所有者；沿用现有共享进度组件 |
| 6. Schema changes | 无 |
| 7. Migrations | 无迁移或回填；既有兼容读路径通过真实 Mongo 恢复验证 |
| 8. Environment changes | 无实际环境或依赖变化；测试使用显式隔离数据库变量 |
| 9. Compatibility impact | 模型/研究运行行为不变；`test:release` 增加 20 项 M1.0 测试和两项 Harness 约束；进度值继续使用相同 0–100 接口 |
| 10. Resume / recovery | modelState v1-v4、历史账本、任务 pin、原截止时间和已完成调用保持；恢复测试通过 |
| 11. Feature flags | 无开关变化，不启用自动切换、旗舰、Judge 或付费评测 |
| 12. Tests executed | 全量、发布、相关域、Mongo、路由、配置、构建、UI、部署及四类离线评测 |
| 13. Test results | 见验证矩阵与 `completion.json` |
| 14. Benchmark | 32 文本、192 Vision、6 费用、12 Judge；全部离线，真实模型请求 0 |
| 15. Security / privacy | 不输出凭据、提示正文或隐藏推理；私有状态隔离与未知值语义不变 |
| 16. Rollback path | 撤回 package 发布入口、Harness 约束及本报告索引，再同步 MANIFEST；无数据回滚需求 |
| 17. Known limitations | 多模型池仍固定首个模型；无管理员可视化配置器；真实质量/费用/外部服务稳定性未验收 |
| 18. Deferred work | 安全模型池故障切换、管理员配置、真实质量与成本验收、生产运营及 V5.3 以后能力继续延期 |
