from dataclasses import dataclass

from ..schemas import AssessmentDetail, CitedAnswer, Evidence
from .model_provider import AnswerProvider


@dataclass(frozen=True)
class RankedEvidence:
    evidence: Evidence
    score: float


class ReviewEngine:
    """Evidence-first review engine used by demo mode and provider adapters."""

    def __init__(self, provider: AnswerProvider | None = None) -> None:
        self.provider = provider

    @staticmethod
    def retrieve(assessment: AssessmentDetail, question: str, limit: int = 5) -> list[RankedEvidence]:
        terms = {term for term in question.lower().replace("?", "").split() if len(term) > 3}
        candidates: dict[tuple[str, str], Evidence] = {}
        for finding in assessment.finding_items:
            for item in finding.evidence:
                candidates[(item.document_id, item.quote)] = item

        ranked = []
        for evidence in candidates.values():
            haystack = f"{evidence.section} {evidence.quote}".lower()
            overlap = sum(1 for term in terms if term in haystack)
            score = overlap / max(len(terms), 1)
            ranked.append(RankedEvidence(evidence=evidence, score=score))
        return sorted(ranked, key=lambda item: item.score, reverse=True)[:limit]

    def answer(self, assessment: AssessmentDetail, question: str) -> CitedAnswer:
        ranked = self.retrieve(assessment, question)
        citations = [item.evidence for item in ranked if item.score > 0]
        normalized = question.lower()

        def control_evidence(control: str) -> list[Evidence]:
            finding = next((item for item in assessment.finding_items if item.control == control), None)
            return finding.evidence if finding else []

        if "guarantee" in normalized or "no security incident" in normalized:
            answer = "The submitted evidence is insufficient; the system cannot determine future incident outcomes."
            citations = []
        elif "incident" in normalized or "notification" in normalized:
            citations = control_evidence("IR-02")
            answer = (
                "The maximum incident-notification period is not defined in the submitted policy. "
                "It promises notification without undue delay, so the required 24-hour commitment remains a high-risk gap."
            )
        elif "retain" in normalized or "retention" in normalized or "delete" in normalized:
            citations = control_evidence("DP-07")
            answer = (
                "The DPA permits backup retention for up to 90 days after termination. "
                "This requires review against the organization's retention policy."
            )
        elif "encrypt" in normalized:
            citations = control_evidence("CR-04")
            answer = "The package states that data is encrypted with AES-256 at rest and TLS 1.2 or later in transit."
        else:
            answer = (
                "The current review contains two unresolved control gaps and one supported encryption control. "
                "The assessment should remain in human review until the notification and retention issues are resolved."
            )
            citations = [item.evidence for item in ranked[:3]]

        if self.provider and citations:
            answer = self.provider.generate(question, citations, answer)

        return CitedAnswer(
            answer=answer,
            citations=citations,
            confidence=0.92 if citations else 0.55,
            grounded=bool(citations),
        )
