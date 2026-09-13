# M1.1 Rollback

Restore the pre-M1.1 versions of Agent context construction, model-state creation, research-context packing, execution compaction, telemetry presentation and the UI label.

Jobs already created with `contextVersion=1` must remain paused until M1.1 code is restored; an older binary does not know the new context contract. Do not delete the field, checkpoint or completed tool receipts to force a resume. Historical jobs without the field remain compatible throughout rollback.

The additive public `usage` response can be ignored by an older UI. No ModelCall, evidence, calculation, report or research cutoff data needs removal.
