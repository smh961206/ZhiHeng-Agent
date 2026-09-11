# V4.9 Rollback

Review fixes: preserve progress files and reservations on code rollback. The old runner cannot safely resume the new journal; do not delete it or repeat uncertain paid calls. There is no database rollback. Keep the completion-wait/controller protection together when reverting the lifecycle changes; never remove a running owner's lock to force a retry. FEATURE_VISION_ROUTING=false invalidates cached activation immediately; older approved comparisons are not silently upgraded to the new code binding.

CURRENT V4.9.0: revert this inventory/checker/test/documentation patch and restore the prior CURRENT pointer if cancelling release activation; refresh MANIFEST hashes. No runtime, database, environment or archive rollback is required. Existing legacy execution and resume readers remain unchanged.

CURRENT V4.9.8: FEATURE_VISION_ROUTING=false restores the legacy default for new independent reads/jobs. After stopping the current instance, pnpm start:legacy overrides inherited text and Vision activation together without editing .env. Retain the compatible modelState reader. Existing candidate pins pause until matching admission is restored; they cannot silently resume on legacy. No database downgrade, evidence deletion, archive rewrite or historical pin replacement is required. Unit and Mongo process-restart tests exercise these states.

## Rollback requirements
- State whether code rollback alone is sufficient.
- State whether schema/data rollback is required.
- State whether newly written data remains readable by the old path.
- Validate rollback before deleting legacy paths.
