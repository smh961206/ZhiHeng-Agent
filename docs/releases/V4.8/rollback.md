# V4.8 Rollback

Set MODEL_ROUTING_MODE=legacy; retain legacy profiles/config and compatible checkpoint reads.

## Rollback requirements
- State whether code rollback alone is sufficient.
- State whether schema/data rollback is required.
- State whether newly written data remains readable by the old path.
- Validate rollback before deleting legacy paths.
