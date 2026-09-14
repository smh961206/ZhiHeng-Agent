# Failure Contract
Implementation Status: FUTURE; target V5.11.

Failure fields:
failureId, category, severity, rootCauseLayer, detection, affected release/domain, fix, regressionCase, status.

Categories include:
data, retrieval, fact, model, tool, Knowledge, validation, point_in_time, provenance, decision.

## Current implementation evidence

Current errors, warnings, failed tool receipts and recovery metadata exist. They are not a normalized Failure registry or learning pipeline.

See the [current implementation map](../architecture/current-implementation-map.md). This contract text alone changes no persisted object, field requirements, API, migration or financial meaning.
