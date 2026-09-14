# Security Master Contract
Implementation Status: PARTIAL; target V5.5.

Canonical identities:
- issuerId: economic/legal issuer identity
- securityId: financial instrument identity
- listingId: exchange listing identity, time-bounded
- shareClassId: economic share-class identity

Ticker is not a stable primary key.

Must support over time:
A/H, ADR/ADS, preferred shares, ticker changes, splits/mergers, listing validity, parent/subsidiary relations.

## Current implementation evidence

`python_backend/domain/securities.py`、`python_backend/infrastructure/market.py` 与 `src/domain/` 提供 A/H/US 输入识别、交易所查询和显示语义。稳定的 issuer/listing/share-class 实体与有效期历史仍未实现。验证见 Python 证券测试和前端 security-display 测试。

See the [current implementation map](../architecture/current-implementation-map.md). This contract text alone changes no persisted object, field requirements, API, migration or financial meaning.
