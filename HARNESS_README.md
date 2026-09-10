# ZhiHeng-Agent Codex Harness — Full Evolution Package

这是 ZhiHeng-Agent 的 **Codex-native 工程控制面 + 完整长期演进路线**。

它不是单一 V4.8 规格，也不是一份只描述愿景的 Master Prompt。它把长期目标拆成：

1. 永久架构边界；
2. 当前代码职责映射；
3. Domain Contracts；
4. System Invariants；
5. Architecture Decision Records；
6. Core Release：H0 → V4.8 → ... → V6.0；
7. Capability Tracks；
8. Benchmark / Failure / Migration / Release 模板。

## 第一原则

Codex 不应依赖“记住过去聊天”。

仓库本身必须能够回答：

- ZhiHeng 当前是什么；
- 最终要演进成什么；
- 当前只允许实现哪个 Release；
- 一个领域对象的 canonical contract 是什么；
- 哪些状态永远非法；
- 为什么我们故意选择当前架构；
- 当前仓库已有哪部分能力，不能重复造一套；
- 怎样证明本次修改没有损害投资研究质量；
- 如何迁移、回滚和恢复。

## 使用顺序

Codex 每次进入仓库必须依次读取：

1. `/AGENTS.md`
2. `/docs/releases/CURRENT`
3. `/docs/architecture/00-system-map.md`
4. `/docs/architecture/current-implementation-map.md`
5. 当前 Release 的 `/docs/releases/<CURRENT>/README.md`
6. 当前 Release 的 `implementation.md`
7. 涉及领域的 `/docs/contracts/*`
8. 涉及领域的 `/docs/invariants/*`
9. 相关 `/docs/adr/*`
10. 当前代码和测试

## 初次安装

本包把 `docs/releases/CURRENT` 设置为 `H0`。

H0 只负责：

- 检查本 Harness 与真实仓库的一致性；
- 校准 current implementation map；
- 校准 Contracts/ADRs/Invariants；
- 跑完整旧测试；
- 确认 Runtime Behavior Change = 0。

H0 验收通过后才把 `CURRENT` 改为 `V4.8`。

## 最终目标

ZhiHeng 最终不是“集成更多模型的投资 Agent”，而是：

> 一个维护 Reality → Truth → Belief → Future → Decision → Outcome → Learning 全链路的 Investment Intelligence Operating System。

具体路线见：

`docs/roadmap/MASTER-ROADMAP.md`

## H0 calibrated baseline

The actual runtime framework is 4.7; Harness CURRENT is independent. Use `CODEX_EXECUTION_PROTOCOL.md` and `docs/releases/H0/DETAILED_INDEX.md` for exact execution order. See `docs/architecture/current-implementation-map.md` and `docs/releases/H0/audit-findings.md` for implemented capabilities and unresolved gaps. Accepted ADRs do not imply completed future implementations.
