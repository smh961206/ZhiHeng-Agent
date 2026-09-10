# V5.5 Rollback

Disable Fact Engine canonical-write path; retain dual-read and current financial observation/resolver paths.

## Rollback requirements
- State whether code rollback alone is sufficient.
- State whether schema/data rollback is required.
- State whether newly written data remains readable by the old path.
- Validate rollback before deleting legacy paths.
