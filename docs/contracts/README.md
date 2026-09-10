# Domain Contracts

A contract defines canonical semantics. It is stronger than roadmap prose and weaker than current executable code/tests during migration.

Every contract should state implementation status:
- CURRENT
- PARTIAL
- FUTURE
- DEPRECATED

A FUTURE contract is a design reservation only.

## H0 status interpretation

A PARTIAL contract has implemented predecessors; fields described as mature/eventual/target are not asserted to exist. Each contract has one implementation status. Acceptance of a design is separate from its runtime implementation. See [H0 implementation map](../architecture/current-implementation-map.md).
