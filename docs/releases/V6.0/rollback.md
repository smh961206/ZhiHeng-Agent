# V6.0 Rollback

Feature-by-feature flags; platform schema migrations require backups, reversible ownership mapping, and staged cutover.

## Rollback requirements
- State whether code rollback alone is sufficient.
- State whether schema/data rollback is required.
- State whether newly written data remains readable by the old path.
- Validate rollback before deleting legacy paths.
