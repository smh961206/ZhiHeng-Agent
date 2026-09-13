# V5.2 benchmark

Frozen corpus: tests/fixtures/judge-v52.json (version 1, simulation). Twelve cases cover L1/L2 acceptance, abstention, future/unknown dates, missing counter evidence, incompatible basis, no material conflict, incomplete conclusions, human override, forged blocks and duplicate IDs. Additional unit tests cover actual valuation interval materiality, review failure eligibility and invalid Judge output.

Existing benchmark/graders.mjs and benchmark/statistics.mjs own grading and paired cost/correctness comparison. scripts/judge-benchmark.mjs creates offline safety artifacts without model calls. Candidate outputs are explicit test oracles, baseline abstains; any apparent correctness lift is simulation only and must not be marketed as real model performance.

Real acceptance must use original paired live outputs, exact fixtures and actual ModelCall cost receipts; operator artifact review and code/config binding precede activation. See runbook.md. User paused this stage. Real correctness benefit, incremental cost justification, 100-job rare-use observation and production value remain unknown.

Existing text, Vision and cost benchmarks also run as regression gates; hashes and totals are recorded in validation-results.json.
