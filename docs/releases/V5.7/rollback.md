# V5.7 Rollback

Feature flags restore legacy report-first path; structured state remains non-destructive.

## Rollback requirements
- State whether code rollback alone is sufficient.
- State whether schema/data rollback is required.
- State whether newly written data remains readable by the old path.
- Validate rollback before deleting legacy paths.
