# V4.8 Rollback

## Current V4.8.0 inventory boundary

V4.8.0 adds only inventory documentation and static tests. Revert that subrelease's files/manifest changes to roll it back; there is no runtime or database rollback. MODEL_ROUTING_MODE and Legacy Profiles are not implemented at this point. The release-level switch below is a future rollout requirement, not a current operational command.

## Current V4.8.1 Catalog boundary

Revert the V4.8.1 Catalog/test additions, documentation/manifest updates and the equivalent Vision predicate extraction. Existing model request owners and environment settings remain usable throughout. No research record, schema, checkpoint or database rollback is needed. MODEL_ROUTING_MODE is still FUTURE and is not a usable rollback switch for this subrelease.

## Target routing rollback — FUTURE

Set MODEL_ROUTING_MODE=legacy; retain legacy profiles/config and compatible checkpoint reads.

## Rollback requirements
- State whether code rollback alone is sufficient.
- State whether schema/data rollback is required.
- State whether newly written data remains readable by the old path.
- Validate rollback before deleting legacy paths.
