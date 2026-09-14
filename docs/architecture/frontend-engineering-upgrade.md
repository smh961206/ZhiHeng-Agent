# 前端工程化升级决策与实施基线

状态：Platform V5.3 已实施，2026-09-14。

## 目标

本迭代把此前关于 React、工程化依赖、状态管理和后续优化的讨论收敛为可执行基线。目标是让前端改动具备可重复的类型、规范、契约、组件测试和构建验证，同时保持 Python/FastAPI 为唯一后端、保持研究对象为服务端权威状态。

## 实施前现状

- 浏览器已使用 React 19、React Router 7、Vite 6、Tailwind CSS 4、Radix UI 和 shadcn 组件结构。
- 路由页面已经懒加载，并有页面级错误边界；生产构建已按页面拆出工作台、研究详情、手册和历史记录。
- `src/` 有 121 个 TypeScript/TSX 文件、约 6,170 行自有代码；`ResearchDetail.tsx` 为 743 行，`App.tsx` 为 191 行。
- 原子 JavaScript→TypeScript 迁移使用 `noCheck`，因此原 `pnpm typecheck` 只能证明文件可由 TypeScript 解析，不能证明语义类型正确。
- 实施前完整 strict 检查产生约 2,100 条诊断，基础非 strict 语义检查也有约 600 条；不能通过机械断言或大面积 `any` 一次性掩盖。
- 现有 53 个前端领域/展示单元测试使用 Node 原生测试，SSR 路由检查覆盖 5 条路径，Playwright 用于少量真实浏览器验证；此前缺少 DOM 组件交互测试层。
- API 调用集中在 `src/lib/api.ts` 和若干 hooks，但前端没有由 FastAPI OpenAPI 自动生成并持续校验的契约类型。

## 最终决策

1. 保留 React、React Router、Vite、Tailwind、Radix/shadcn 和 Playwright；当前没有框架替换收益。
2. TypeScript 采用“双层收敛”：`tsconfig.json` 保证全仓迁移源码可解析和构建，`tsconfig.strict.json` 对已治理边界执行真正的 strict 检查。新工程入口、API 客户端和新增组件测试必须进入 strict 边界。
3. ESLint 只执行当前有明确缺陷价值的 React Hooks 和 Fast Refresh 规则，不引入大规模格式重写。
4. Vitest、Testing Library、user-event、jest-dom 和 jsdom 构成组件交互测试层；Node 原生测试继续负责无 DOM 的纯函数与架构测试，Playwright继续负责必须由真实浏览器证明的场景。
5. FastAPI OpenAPI 是 HTTP 请求契约的生成来源。提交的 `src/generated/api-schema.ts` 必须可重复生成，CI 发现漂移即失败。
6. 不引入 Redux、Zustand、MobX、Recoil 或同类全局状态库。当前状态继续按所有权放置：局部交互在组件/hook，可分享导航状态在 URL，研究任务、证据、计算和恢复状态在 FastAPI/MongoDB。
7. 不引入 TanStack Query。当前远程状态访问尚未出现大量跨页面缓存、乐观更新、失效协调或离线同步；出现这些模式后再单独评估服务端状态缓存。
8. 不引入 Storybook 和 MSW。当前组件库维护人数、视觉验收规模和接口模拟复杂度尚未达到它们的持续维护成本。

## 本次已交付

| 能力 | 实现 | 验收入口 |
| --- | --- | --- |
| 严格类型岛 | 工程脚本、API 客户端、Button、删除确认组件、生成类型和组件测试进入 `tsconfig.strict.json` | `pnpm typecheck` |
| Hooks 约束 | ESLint Flat Config；修复页面标题、组合约束、研究详情目录/来源、使用指南和配置刷新中的依赖或清理问题 | `pnpm lint` |
| API 契约生成 | Python CLI 导出 FastAPI OpenAPI；Node 工具生成 TypeScript；SPA fallback 不进入 API schema | `pnpm api:types` / `pnpm api:types:check` |
| 组件交互测试 | 删除研究对话框覆盖明确确认、错误展示和 pending 锁定 | `pnpm test:components` |
| 前端聚合验证 | 原生单元测试、组件测试、SSR 路由和生产构建统一入口 | `pnpm test:frontend` / `pnpm quality:frontend` |
| CI | lint、OpenAPI 漂移、组件测试、类型检查和构建进入现有质量流水线 | `.github/workflows/quality.yml` |
| 防回退 | 架构测试固定 strict、lint、组件测试、API 类型入口并阻止无记录加入常见全局状态库 | `tests/typescript-migration.test.ts` |

## 包选择

| 包 | 结论 | 原因 |
| --- | --- | --- |
| `eslint`、`typescript-eslint` | 引入 | 为 TypeScript/TSX 提供统一静态规则入口 |
| `eslint-plugin-react-hooks` | 引入 | 发现实际 effect 依赖和清理缺陷 |
| `eslint-plugin-react-refresh` | 引入 | 约束会破坏开发态 Fast Refresh 的导出结构 |
| `vitest` | 引入并固定在 Vite 6 兼容版本 | 复用 Vite 转换链，运行 TSX 组件测试 |
| Testing Library、`user-event`、`jest-dom`、`jsdom` | 引入 | 以用户可见角色和交互验证 React 组件 |
| `openapi-typescript` | 引入 | 将 FastAPI OpenAPI 转为无运行时依赖的 TypeScript 类型 |
| Redux/Zustand/MobX/Recoil | 不引入 | 没有跨路由共享可变客户端状态事实 |
| TanStack Query | 不引入 | 当前 API 生命周期可由现有 hooks 清晰管理 |
| Storybook、MSW | 不引入 | 当前协作和测试场景未形成稳定需求 |

选择依据与官方能力边界见 [typescript-eslint](https://typescript-eslint.io/getting-started/)、[Vitest](https://vitest.dev/guide/)、[React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)、[openapi-typescript](https://openapi-ts.dev/introduction) 和 [React reducer/context](https://react.dev/learn/scaling-up-with-reducer-and-context)。

## 状态所有权

| 状态 | 当前所有者 |
| --- | --- |
| 输入草稿、弹层、展开、焦点、短暂错误 | React 组件或专用 hook |
| 可分享、可返回的筛选和标签页 | URL query/hash |
| 研究任务、进度、来源、报告和成本 | FastAPI API 与服务端持久化 |
| 证据、事实、计算、恢复和 Knowledge 固定信息 | Python 结构化研究对象 |
| 静态平台与展示规则 | `src/config/`、`src/domain/` |

只有出现下列事实之一，才重新评估状态库：同一份可变客户端状态跨多个远距离路由写入；乐观更新需要统一回滚和缓存失效；引入离线编辑及冲突合并；重复同步逻辑造成已验证缺陷；或 React reducer/context 已无法保持清晰边界。

## TypeScript 收敛规则

- 禁止把完整 strict 诊断通过大面积 `any`、`unknown as`、`@ts-ignore` 或 `@ts-nocheck` 清零。
- 每次扩展 strict 范围，先定义该边界的真实输入、输出、缺失值和错误语义，再加入 `tsconfig.strict.json`。
- API 响应缺少 FastAPI `response_model` 时，生成类型只能如实保持未知，不能由前端猜测金融或研究字段。
- 优先顺序为：公共 API 请求/响应 → 研究任务与恢复 view model → 证据/引用展示 → 证券展示 → 组件 props → 其余 UI 状态。
- `ResearchDetail.tsx` 的拆分以稳定职责和测试为前提，不按行数机械拆文件；报告、来源、审计、目录导航和恢复动作是候选边界。

## 完成定义

本次工程化基线在以下条件同时满足时完成：依赖无 peer 冲突；lint 零错误/零警告；strict 子边界通过；OpenAPI 生成可重复；组件测试通过；原有 53 个测试、SSR 路由和生产构建通过；CI 包含新增检查；状态管理库未在没有触发事实时加入；文档和完成报告与实际命令一致。

完整仓库 strict 化和 `ResearchDetail.tsx` 的领域拆分属于后续按边界实施的技术债清偿，不宣称在本次基线中已经完成。它们不能改变 API、证据、财务、point-in-time 或恢复语义。
