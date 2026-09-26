from typing import Protocol

from openai import OpenAI

from ..schemas import Evidence


class AnswerProvider(Protocol):
    def generate(self, question: str, evidence: list[Evidence], draft: str) -> str: ...


class OpenAIAnswerProvider:
    """Optional model adapter. Retrieval and citations remain application-owned."""

    def __init__(self, api_key: str, model: str) -> None:
        self.client = OpenAI(api_key=api_key)
        self.model = model

    def generate(self, question: str, evidence: list[Evidence], draft: str) -> str:
        context = "\n\n".join(
            f"[{item.document_name}, page {item.page or 'n/a'}, {item.section}]\n{item.quote}"
            for item in evidence
        )
        response = self.client.responses.create(
            model=self.model,
            instructions=(
                "You are a vendor security evidence reviewer. Answer only from the supplied evidence. "
                "Do not invent commitments, certifications, dates, or controls. If the evidence is insufficient, say so."
            ),
            input=f"Question: {question}\n\nEvidence:\n{context}\n\nValidated draft:\n{draft}",
        )
        return response.output_text.strip() or draft
