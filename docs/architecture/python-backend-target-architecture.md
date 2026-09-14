# Python FastAPI 后端目标架构

状态：Current
发布线：Platform V5.3 / Knowledge K1.0.0

```text
React + TypeScript browser
          │ /api + SSE
          ▼
FastAPI app / middleware / schemas
          │
          ├── ResearchService ── Recovery checkpoints
          ├── ModelGateway ───── Provider-neutral governance
          ├── KnowledgeStore ─── Immutable K-Series snapshots
          ├── Official/Vendor/Web/Document evidence + archive
          ├── Bounded context + deterministic financial analytics
          └── StoragePort ────── MongoDB + GridFS
```

## 依赖方向

`app → services → domain/ports`，基础设施实现依赖端口。业务模块不能调用具体模型提供方，报告不能成为规范化事实存储，向量相似度不能替代精确财务证据。

## 数据语义

研究输入、事实、计算、主张、预测、决策和结果分别保存。缺失值保持 `null`；每项可验证数字携带期间、币种、单位、股本、会计范围、来源和证据块。快照与检查点共同固定 Knowledge 和执行兼容版本，恢复不能扩大原始数据截止点。

## 运行边界

Python 是唯一后端运行时。Node 仅用于 Vite 构建、React 前端与共享 TypeScript 检查。仓库通过架构测试禁止 `server/`、Node 后端启动命令和后端专用 npm 依赖重新出现。
