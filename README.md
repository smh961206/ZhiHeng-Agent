# ZhiHeng Agent

ZhiHeng Agent 是证据优先的投资研究系统。当前产品由 React/TypeScript 浏览器客户端和 Python FastAPI 后端组成。

## 当前版本

项目只维护两条对外发布线：

- **Platform V5.3**：应用、API、工程和执行能力。
- **Knowledge K1.0.0**：研究规则、方法与不可变快照。

`executionCompatibilityVersion` 和 `contractVersion` 是内部恢复兼容标记，仅在序列化格式不兼容时更新，不构成第三条发布线。M1.x、历史 V 系列和未来路线名称只保留为工程或历史记录。

## 架构

```text
React + TypeScript (`src/`)
        │ /api + SSE
        ▼
Python FastAPI (`python_backend/`)
        ├─ 输入、证券与研究计划
        ├─ Knowledge K-Series 快照
        ├─ 文档、网页与证据处理
        ├─ 确定性金融计算
        ├─ Provider-neutral Model Gateway
        ├─ 研究生命周期、恢复和交付
        └─ MongoDB + GridFS
```

- `src/`：React 页面、组件、Hooks、浏览器工具和客户端展示规则。
- `src/domain/`：只服务浏览器展示与 view-model 的规则，不作为后端业务真相源。
- `python_backend/`：唯一后端，实现 HTTP、SSE、研究、证据、模型、计算和持久化。
- `python_tests/`：后端契约与业务测试。
- `tests/`：聚焦的前端单元测试、TypeScript 架构约束与 SSR 路由验证。
- `knowledge/`：Knowledge K-Series 规则源、活动指针和不可变快照。

仓库不再包含 Node 后端、跨运行时 `shared/` 或旧模型 Benchmark/Champion 平台。

## 本地开发

要求：

- Node.js >= 22.13
- Python >= 3.11
- MongoDB 8（需要持久化验证时）

安装依赖：

```bash
pnpm install
python -m pip install -r requirements.txt
```

从示例创建本地配置：

```bash
cp .env.example .env
cp config/models.example.json config/models.local.json
```

启动前后端开发服务：

```bash
pnpm dev
```

前端由 Vite 提供，FastAPI 默认监听 `127.0.0.1:3001`。

## 常用命令

```bash
pnpm build
pnpm typecheck
pnpm test
pnpm test:routes
pnpm test:python
pnpm lint:python
pnpm typecheck:python
pnpm models:check
pnpm db:migrate
```

Knowledge 快照维护：

```bash
pnpm knowledge:backup
pnpm knowledge:activate
```

## 配置

- `.env`：本地运行设置与密钥引用。
- `.env.production`：生产设置。
- `config/models.local.json`：本地模型和阶段分配。
- `config/models.production.json`：生产模型和阶段分配。
- `config/research-budget.example.json`：可选研究资源预算模板；默认运行模式为关闭。

模型供应商行为必须封装在 `python_backend/infrastructure/model_gateway.py` 与 `model_adapter.py` 后。业务逻辑不得依赖具体供应商或模型名称。密钥不得写入 JSON、源码、报告或公开 API。

## 研究安全边界

- 证据先于结论，缺失数据保持缺失。
- 期间、币种、股本口径、会计范围、估值基础和发布时间必须明确。
- 已验证事实必须保留来源和依赖关系。
- 观察、假设、预测和判断不得伪装为已验证事实。
- 研究续跑保留原始市场与资料截止时间。
- 确定性金融计算和硬校验由程序执行。
- 报告是视图，长期规范状态属于结构化研究对象。

## 文档入口

- [系统地图](docs/architecture/00-system-map.md)
- [当前实现地图](docs/architecture/current-implementation-map.md)
- [平台 V5.3](docs/releases/V5.3/README.md)
- [FastAPI 迁移记录](docs/releases/V5.3/fastapi-backend-migration-report.md)
- [TypeScript 迁移记录](docs/releases/V5.3/typescript-migration-report.md)
- [版本兼容 ADR](docs/adr/ADR-017-platform-execution-compatibility.md)
- [FastAPI ADR](docs/adr/ADR-018-fastapi-backend.md)

历史发布文档只用于追溯当时的实现与验收边界，不代表当前可执行入口。
