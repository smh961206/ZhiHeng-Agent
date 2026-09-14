# V5.3 operator runbook

1. Update the additive governance map and module hashes as part of an explicitly authorized new K-Series release; do not edit the active immutable K1.0.0 snapshot.
2. Run `python -m pytest python_tests/test_knowledge.py`. Any catalog, hash, pointer or snapshot error blocks publication.
3. Run `python -m benchmark.runner` and the release-related tests.
4. Run `python -m python_backend.cli knowledge-backup` to build one immutable snapshot after validation passes.
5. Run `python -m python_backend.cli knowledge-activate` to switch `knowledge/current.json` after review.
6. Confirm `/api/config` and new jobs contain `knowledgeVersion: K1.0.0`, the active snapshot ID and matching Knowledge read receipts.

For rollback, stop creating new jobs and explicitly activate a retained, separately validated K-Series rollback version. Do not rewrite checkpoints or historical hashes. Active K1.0.0 tasks must finish on their pinned snapshot or remain paused. At present K1.0.0 is the only retained Knowledge release, so rollback requires publishing another validated K-Series snapshot first.
