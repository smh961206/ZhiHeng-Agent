# Release Process

The repository maintains two external release lines: Platform V and Knowledge K. Execution compatibility and output contract numbers are internal compatibility markers.

1. Read `AGENTS.md`, `docs/releases/CURRENT`, the current implementation maps and the active release specification.
2. Inspect executable code, tests, contracts, invariants and relevant ADRs before editing.
3. Run tests directly related to the change and record real failures.
4. Implement only the user-authorized active scope while keeping the repository runnable.
5. Add an executable architecture check when it can protect a meaningful boundary.
6. Analyze schema, compatibility, point-in-time, provenance and recovery impact when applicable.
7. Run broader UI, Docker, real-model or benchmark validation only when explicitly requested or required by the change.
8. Produce the completion report required by `AGENTS.md`.
9. Change `CURRENT` only after the corresponding release is actually accepted.

Never combine multiple major releases in one uncontrolled change.
