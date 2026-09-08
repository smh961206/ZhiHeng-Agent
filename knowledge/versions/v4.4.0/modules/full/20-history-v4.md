# 20. V3 → V4 重构摘要

V4 保留 V3 的核心价值投资框架，并做以下结构升级：

1. 将“长 Prompt”重构为 Router + Engines + Audit。
2. Mode 负责路由，不再让所有模块默认全执行。
3. 将研究动作与组合动作分离。
4. 增加 FCFF / FCFE / EV→Equity / 稀释股本等估值计算协议。
5. 区分 Quick FCF 与可用于估值的正常化现金流。
6. 金融企业不机械套用工业企业 FCF / ROIC。
7. “悲观系数”降级为数据不足时的转换工具，不再默认使用。
8. 增加 Risk Pricing Protocol，减少重复折价。
9. 评分增加离散锚点，减少伪精确和评分漂移。
10. 输出拆分为 Quick / Standard / Deep / Update / Comparison / Dividend / Battle Map。
11. Audit 增加现金流口径、DCF桥接、重复风险计价和组合适用性检查。
12. 保留 V3 的证据链、股东回报、可证伪、分红承诺、回购分类、三情景估值等核心思想。


---


---

