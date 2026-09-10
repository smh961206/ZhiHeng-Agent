# Engineering Rules for V5.3 → V6.0

后半段版本属于核心数据模型演进，不允许“大版本一次性重写”。

Codex 每次必须：

1. 读取 `AGENTS.md` 与 `CURRENT`。
2. 读取当前大版本 `implementation.md`。
3. 明确当前正在执行哪个子版本。
4. 读取涉及领域 Contracts / Invariants / ADR。
5. 扫描现有相似模块，禁止创建平行系统。
6. 修改 Schema 时使用 additive → dual read → new write → backfill → verify → cutover → cleanup。
7. 子版本完成即运行对应测试。
8. 高风险版本 V5.5/V5.6/V5.7/V5.9/V5.10/V5.11 必须默认 feature-flag/dual path。
9. 旧路径至少保留到替代路径经过后续稳定 Release 验证。
10. 不得把 FUTURE Contract 当作当前实现事实。
