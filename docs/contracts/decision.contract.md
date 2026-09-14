# Decision Contract
Implementation Status: FUTURE; target V5.9.

Decision derives from:
Research State + Mandate + Expected Return + Downside + Uncertainty + Opportunity Cost + Portfolio Context.

States may include:
Reject | Watch | Starter | Normal | HighConviction | Reduce | Exit

V5.9 produces recommendations/state only; it does not execute trades.

## Current implementation evidence

`python_backend/domain/review.py`、`python_backend/application/research_service.py` 与 `src/domain/research-record.ts` 已生成并校验结构化 action/confidence。它们尚不是与 mandate 绑定的未来决策策略引擎。

See the [current implementation map](../architecture/current-implementation-map.md). This contract text alone changes no persisted object, field requirements, API, migration or financial meaning.
