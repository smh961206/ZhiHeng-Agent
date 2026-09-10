# H0 Rollback

Revert only changes made by H0 to Harness documents, manifest/static tests, the user-approved deployment fixture copy list and the three authorized UI test repairs documented in test-failure-analysis.md. Preserve all unrelated user work and historical Knowledge. Restore CURRENT=H0 when undoing acceptance.

No runtime/API/schema/data migration occurred, so no database rollback or deletion is required. Temporary test containers/databases may be removed only by their unique H0/test identities; never remove development/production volumes. Baseline file hashes and the completion report identify the exact change set.
