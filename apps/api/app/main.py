from uuid import UUID

from fastapi import FastAPI, File, HTTPException, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from .repository import repository
from .config import get_settings
from .schemas import (
    AssessmentDetail,
    AssessmentSummary,
    ActivityEvent,
    ApprovalRequest,
    CitedAnswer,
    ControlRecord,
    Document,
    EvaluationMetrics,
    NewAssessmentRequest,
    NotificationItem,
    QuestionRequest,
    ReviewDecision,
)
from .services.review_engine import ReviewEngine
from .services.evaluation import evaluate_engine
from .services.model_provider import OpenAIAnswerProvider

app = FastAPI(
    title="AI-Powered Vendor Document Review API",
    description="Evidence-linked vendor security document review and human approval API.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
settings = get_settings()
provider = None
if not settings.demo_mode and settings.openai_api_key:
    provider = OpenAIAnswerProvider(settings.openai_api_key, settings.openai_model)
engine = ReviewEngine(provider=provider)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "model-backed" if provider else "deterministic-demo"}


@app.get("/api/v1/assessments", response_model=list[AssessmentSummary])
def list_assessments() -> list[AssessmentDetail]:
    return repository.list()


@app.post("/api/v1/assessments", response_model=AssessmentDetail, status_code=status.HTTP_201_CREATED)
def create_assessment(request: NewAssessmentRequest) -> AssessmentDetail:
    return repository.create(request)


@app.get("/api/v1/assessments/{assessment_id}", response_model=AssessmentDetail)
def get_assessment(assessment_id: UUID) -> AssessmentDetail:
    assessment = repository.get(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment


@app.post("/api/v1/assessments/{assessment_id}/questions", response_model=CitedAnswer)
def ask_assessment(assessment_id: UUID, request: QuestionRequest) -> CitedAnswer:
    assessment = repository.get(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    answer = engine.answer(assessment, request.question)
    repository.record_question(request.question)
    return answer


@app.put(
    "/api/v1/assessments/{assessment_id}/findings/{finding_id}/decision",
    response_model=AssessmentDetail,
)
def decide_finding(assessment_id: UUID, finding_id: str, decision: ReviewDecision) -> AssessmentDetail:
    assessment = repository.decide(assessment_id, finding_id, decision)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment or finding not found")
    return assessment


@app.put("/api/v1/assessments/{assessment_id}/approve", response_model=AssessmentDetail)
def approve_assessment(assessment_id: UUID, request: ApprovalRequest) -> AssessmentDetail:
    assessment = repository.approve(assessment_id, request)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment


@app.get("/api/v1/assessments/{assessment_id}/documents/{document_id}", response_model=Document)
def get_document(assessment_id: UUID, document_id: str) -> Document:
    assessment = repository.get(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    document = next((item for item in assessment.document_items if item.id == document_id), None)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@app.post("/api/v1/assessments/{assessment_id}/documents", response_model=Document, status_code=status.HTTP_201_CREATED)
async def upload_document(assessment_id: UUID, file: UploadFile = File(...)) -> Document:
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded document is empty")
    if len(contents) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Document exceeds the 20 MB limit")
    document = repository.add_document(assessment_id, file.filename or "uploaded-document", file.content_type or "application/octet-stream", len(contents))
    if not document:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return document


@app.get("/api/v1/assessments/{assessment_id}/report", response_class=PlainTextResponse)
def export_report(assessment_id: UUID) -> PlainTextResponse:
    assessment = repository.get(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    findings = "\n".join(
        f"- [{finding.severity.upper()}] {finding.control}: {finding.title} ({finding.reviewer_decision})"
        for finding in assessment.finding_items
    )
    report = (
        f"# Vendor Security Assessment: {assessment.vendor_name}\n\n"
        f"Service: {assessment.service}\nStatus: {assessment.status.value.replace('_', ' ').title()}\n"
        f"Risk Score: {assessment.risk_score}/100\nEvidence Coverage: {assessment.evidence_coverage:.0%}\n\n"
        f"## Findings\n{findings}\n"
    )
    headers = {"Content-Disposition": f'attachment; filename="{assessment.vendor_name.lower().replace(" ", "-")}-assessment.md"'}
    return PlainTextResponse(report, headers=headers)


@app.get("/api/v1/review-queue", response_model=list[AssessmentSummary])
def review_queue() -> list[AssessmentDetail]:
    return [item for item in repository.list() if item.status in {"ready_for_review", "changes_requested"}]


@app.get("/api/v1/notifications", response_model=list[NotificationItem])
def list_notifications() -> list[NotificationItem]:
    return repository.notifications()


@app.put("/api/v1/notifications/{notification_id}/read", response_model=NotificationItem)
def mark_notification_read(notification_id: str) -> NotificationItem:
    notification = repository.read_notification(notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification


@app.get("/api/v1/activities", response_model=list[ActivityEvent])
def list_activities() -> list[ActivityEvent]:
    return repository.activities()


@app.get("/api/v1/controls", response_model=list[ControlRecord])
def list_controls() -> list[ControlRecord]:
    return repository.controls()


@app.get("/api/v1/evaluations/summary", response_model=EvaluationMetrics)
def evaluation_summary() -> EvaluationMetrics:
    return evaluate_engine(engine, repository.list()[0])


@app.get("/favicon.ico", include_in_schema=False)
def favicon() -> Response:
    return Response(status_code=status.HTTP_204_NO_CONTENT)
