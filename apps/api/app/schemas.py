from datetime import datetime
from enum import StrEnum
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class AssessmentStatus(StrEnum):
    processing = "processing"
    ready_for_review = "ready_for_review"
    approved = "approved"
    changes_requested = "changes_requested"


class Severity(StrEnum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class Evidence(BaseModel):
    document_id: str
    document_name: str
    page: int | None = None
    section: str
    quote: str


class Finding(BaseModel):
    id: str
    control: str
    title: str
    severity: Severity
    status: Literal["gap", "partial", "met"]
    summary: str
    recommendation: str
    confidence: float = Field(ge=0, le=1)
    evidence: list[Evidence]
    reviewer_decision: Literal["pending", "accepted", "rejected"] = "pending"


class Document(BaseModel):
    id: str
    name: str
    document_type: str
    pages: int
    status: Literal["processed", "processing", "failed"]
    controls_found: int
    uploaded_at: datetime


class AssessmentSummary(BaseModel):
    id: UUID
    vendor_name: str
    service: str
    status: AssessmentStatus
    risk_score: int = Field(ge=0, le=100)
    risk_level: Literal["low", "moderate", "high", "critical"]
    documents: int
    findings: int
    evidence_coverage: float = Field(ge=0, le=1)
    updated_at: datetime


class AssessmentDetail(AssessmentSummary):
    owner: str
    due_date: datetime
    framework: list[str]
    document_items: list[Document]
    finding_items: list[Finding]


class QuestionRequest(BaseModel):
    question: str = Field(min_length=5, max_length=2000)


class CitedAnswer(BaseModel):
    answer: str
    citations: list[Evidence]
    confidence: float = Field(ge=0, le=1)
    grounded: bool


class ReviewDecision(BaseModel):
    decision: Literal["accepted", "rejected"]
    note: str = Field(default="", max_length=1000)


class EvaluationMetrics(BaseModel):
    answer_fact_accuracy: float
    retrieval_recall_at_5: float
    citation_precision: float
    safe_abstention_rate: float
    p95_latency_ms: int
    evaluation_cases: int


class NewAssessmentRequest(BaseModel):
    vendor_name: str = Field(min_length=2, max_length=120)
    service: str = Field(min_length=2, max_length=160)
    framework: list[str] = Field(default_factory=lambda: ["SOC 2"])


class ApprovalRequest(BaseModel):
    note: str = Field(default="Approved after evidence review", max_length=1000)


class NotificationItem(BaseModel):
    id: str
    title: str
    message: str
    created_at: datetime
    read: bool = False


class ActivityEvent(BaseModel):
    id: str
    action: str
    detail: str
    actor: str
    created_at: datetime


class ControlRecord(BaseModel):
    id: str
    name: str
    category: str
    status: Literal["gap", "partial", "met"]
    evidence_count: int
    finding_id: str
