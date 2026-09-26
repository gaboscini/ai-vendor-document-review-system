import json
import math
from pathlib import Path
from time import perf_counter

from ..schemas import AssessmentDetail, EvaluationMetrics
from .review_engine import ReviewEngine


def _evaluation_path() -> Path:
    candidates = [
        Path.cwd() / "data" / "evaluation-cases.json",
        Path(__file__).resolve().parents[4] / "data" / "evaluation-cases.json",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError("data/evaluation-cases.json was not found")


def evaluate_engine(engine: ReviewEngine, assessment: AssessmentDetail) -> EvaluationMetrics:
    cases = json.loads(_evaluation_path().read_text(encoding="utf-8"))
    fact_passes = 0
    retrieval_hits = 0
    retrieval_cases = 0
    citation_hits = 0
    citation_total = 0
    abstention_passes = 0
    abstention_cases = 0
    durations_ms: list[float] = []

    for case in cases:
        started = perf_counter()
        result = engine.answer(assessment, case["question"])
        durations_ms.append((perf_counter() - started) * 1000)
        normalized = result.answer.casefold()
        includes = all(value.casefold() in normalized for value in case["must_include"])
        excludes = all(value.casefold() not in normalized for value in case["must_not_include"])
        fact_passes += int(includes and excludes)

        expected_document = case.get("expected_document")
        if expected_document:
            retrieval_cases += 1
            documents = [citation.document_name for citation in result.citations]
            retrieval_hits += int(expected_document in documents[:5])
            citation_total += len(documents)
            citation_hits += sum(document == expected_document for document in documents)

        if case["expected_outcome"] == "abstain":
            abstention_cases += 1
            abstention_passes += int(not result.grounded and not result.citations and includes and excludes)

    sorted_durations = sorted(durations_ms)
    p95_index = max(0, math.ceil(0.95 * len(sorted_durations)) - 1)
    return EvaluationMetrics(
        answer_fact_accuracy=fact_passes / len(cases),
        retrieval_recall_at_5=retrieval_hits / retrieval_cases,
        citation_precision=citation_hits / citation_total if citation_total else 1.0,
        safe_abstention_rate=abstention_passes / abstention_cases,
        p95_latency_ms=max(1, math.ceil(sorted_durations[p95_index])),
        evaluation_cases=len(cases),
    )
