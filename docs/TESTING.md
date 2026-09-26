# Testing and evaluation

## Repository checks

```powershell
npm --prefix apps/web test
python -m pytest apps/api/tests
```

The frontend tests verify that the evidence and human-decision surfaces remain present. API tests verify health, evidence-linked findings, grounded answers, and reviewer decisions.

## AI evaluation gates

A production release should fail when any of these gates regress beyond the approved threshold:

- document classification F1;
- structured extraction field accuracy;
- retrieval recall@5;
- citation precision;
- groundedness;
- abstention accuracy;
- reviewer agreement;
- P95 latency;
- average cost per assessment.

Evaluation fixtures must contain only synthetic or properly authorized content.

