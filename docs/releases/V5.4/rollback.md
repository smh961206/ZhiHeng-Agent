# V5.4 Rollback

Feature flag hybrid retrieval off; fall back to current exact/alias/page evidence search.

## Rollback requirements
- State whether code rollback alone is sufficient.
- State whether schema/data rollback is required.
- State whether newly written data remains readable by the old path.
- Validate rollback before deleting legacy paths.
