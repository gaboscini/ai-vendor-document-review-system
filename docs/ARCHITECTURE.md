# Architecture

## Design objective

The system converts a vendor-document package into an evidence-linked assessment without transferring final risk ownership to an AI model.

## Processing stages

1. Hash and persist the uploaded object.
2. Extract text, tables, page boundaries, and document metadata.
3. Classify the document and select an extraction schema.
4. Produce validated structured fields.
5. Create page-aware semantic chunks.
6. Store embeddings and full-text indexes.
7. Retrieve candidates using tenant and assessment filters.
8. Rerank candidates against the control requirement.
9. Generate a finding with evidence references.
10. Apply deterministic completeness and citation checks.
11. Send the finding to a human review queue.
12. Record the decision as an evaluation signal.

## Trust boundaries

| Decision | Owner |
| --- | --- |
| Document classification suggestion | AI model |
| Extraction schema | Application configuration |
| Candidate evidence retrieval | Hybrid retrieval service |
| Finding proposal | AI review engine |
| Citation completeness | Deterministic validator |
| Risk acceptance | Human reviewer |
| Assessment approval | Authorized human approver |

## Production extensions

- Replace the deterministic review engine with a provider adapter and structured model output.
- Run extraction, embedding, and evaluation through a durable job queue.
- Add SSO and organization-scoped database policies.
- Store source files in encrypted object storage with malware scanning.
- Add OpenTelemetry spans and a Langfuse-compatible trace exporter.
- Create immutable report snapshots and audit-log exports.

