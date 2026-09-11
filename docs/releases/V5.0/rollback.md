# V5.0 Rollback

Disable challenger/A-B and restore prior ModelPolicy version.

## Operational rollback

Set `MODEL_CHAMPION_ENABLED=false`, `MODEL_AB_ENABLED=false` and `MODEL_ROUTING_MODE=legacy` (the existing `start:legacy` entry also forces legacy mode). Keep the registry, comparison artifacts, budget ledgers and research/checkpoint data. New jobs use the prior legacy path. Existing experimental jobs must pause; they are never reassigned to baseline or reacquired under a new cutoff.

To resume a pinned experimental job, restore a compatible V5.0 binary, its exact model/configuration and the retained matching approved policy. A later registry can retain old immutable versions; a changed percentage or stage gets a new policy version/approval. Revocation or removal of the active authorization pauses affected saved work.

Code rollback alone is safe for legacy work but older code does not execute modelState v3: it rejects that state before work. Restore the V5-compatible code to resume those jobs. No database downgrade or data deletion is permitted. Disable configuration using the V5 binary before reverting code. A crashed benchmark lock requires operator confirmation that the recorded process is no longer running; uncertain requests cannot be replayed automatically.

## Rollback requirements
- State whether code rollback alone is sufficient.
- State whether schema/data rollback is required.
- State whether newly written data remains readable by the old path.
- Validate rollback before deleting legacy paths.
