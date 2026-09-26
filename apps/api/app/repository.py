from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from .demo_data import ASSESSMENT_ID, build_demo_assessment
from .schemas import (
    ActivityEvent,
    ApprovalRequest,
    AssessmentDetail,
    AssessmentStatus,
    ControlRecord,
    Document,
    NewAssessmentRequest,
    NotificationItem,
    ReviewDecision,
)


class AssessmentRepository:
    def __init__(self) -> None:
        self._items: dict[UUID, AssessmentDetail] = {ASSESSMENT_ID: build_demo_assessment()}
        now = datetime.now(UTC)
        self._notifications = [
            NotificationItem(id="notification-1", title="Assessment Ready", message="Demo Vendor is ready for human review.", created_at=now - timedelta(minutes=8)),
            NotificationItem(id="notification-2", title="High-Risk Finding", message="IR-02 requires a reviewer decision.", created_at=now - timedelta(minutes=12)),
        ]
        self._activities = [
            ActivityEvent(id="activity-1", action="Evidence Review Completed", detail="Four documents were mapped to 65 controls.", actor="Review Engine", created_at=now - timedelta(minutes=8)),
            ActivityEvent(id="activity-2", action="Finding Proposed", detail="IR-02 was classified as a high-risk gap.", actor="AI Review Engine", created_at=now - timedelta(minutes=11)),
        ]

    def _record(self, action: str, detail: str, actor: str = "Security Reviewer") -> None:
        self._activities.insert(0, ActivityEvent(id=f"activity-{uuid4()}", action=action, detail=detail, actor=actor, created_at=datetime.now(UTC)))

    def list(self) -> list[AssessmentDetail]:
        return [deepcopy(item) for item in self._items.values()]

    def get(self, assessment_id: UUID) -> AssessmentDetail | None:
        item = self._items.get(assessment_id)
        return deepcopy(item) if item else None

    def create(self, request: NewAssessmentRequest) -> AssessmentDetail:
        now = datetime.now(UTC)
        assessment = AssessmentDetail(
            id=uuid4(), vendor_name=request.vendor_name, service=request.service, status="processing",
            risk_score=0, risk_level="low", documents=0, findings=0, evidence_coverage=0,
            updated_at=now, owner="Security Review Team", due_date=now + timedelta(days=7),
            framework=request.framework, document_items=[], finding_items=[],
        )
        self._items[assessment.id] = assessment
        self._record("Assessment Created", f"{request.vendor_name} was added to the processing queue.")
        return deepcopy(assessment)

    def decide(self, assessment_id: UUID, finding_id: str, decision: ReviewDecision) -> AssessmentDetail | None:
        item = self._items.get(assessment_id)
        if not item:
            return None
        for finding in item.finding_items:
            if finding.id == finding_id:
                finding.reviewer_decision = decision.decision
                item.updated_at = datetime.now(UTC)
                self._record("Finding Decision Recorded", f"{finding.control} was {decision.decision}.")
                return deepcopy(item)
        return None

    def approve(self, assessment_id: UUID, request: ApprovalRequest) -> AssessmentDetail | None:
        item = self._items.get(assessment_id)
        if not item:
            return None
        item.status = AssessmentStatus.approved
        item.updated_at = datetime.now(UTC)
        self._record("Assessment Approved", f"{item.vendor_name}: {request.note}")
        return deepcopy(item)

    def add_document(self, assessment_id: UUID, filename: str, content_type: str, size: int) -> Document | None:
        item = self._items.get(assessment_id)
        if not item:
            return None
        extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else "file"
        document = Document(
            id=f"doc-{uuid4()}", name=filename, document_type=content_type or extension,
            pages=1, status="processed", controls_found=0, uploaded_at=datetime.now(UTC),
        )
        item.document_items.append(document)
        item.documents = len(item.document_items)
        item.updated_at = datetime.now(UTC)
        self._record("Document Uploaded", f"{filename} ({size} bytes) was added to {item.vendor_name}.")
        return deepcopy(document)

    def notifications(self) -> list[NotificationItem]:
        return deepcopy(self._notifications)

    def read_notification(self, notification_id: str) -> NotificationItem | None:
        item = next((entry for entry in self._notifications if entry.id == notification_id), None)
        if not item:
            return None
        item.read = True
        return deepcopy(item)

    def activities(self) -> list[ActivityEvent]:
        return deepcopy(self._activities)

    def controls(self) -> list[ControlRecord]:
        assessment = self._items[ASSESSMENT_ID]
        categories = {"IR": "Incident Response", "DP": "Data Protection", "CR": "Cryptography", "TP": "Third Parties"}
        return [
            ControlRecord(
                id=finding.control, name=finding.title,
                category=categories.get(finding.control[:2], "Security"), status=finding.status,
                evidence_count=len(finding.evidence), finding_id=finding.id,
            )
            for finding in assessment.finding_items
        ]

    def record_question(self, question: str) -> None:
        self._record("Evidence Question Answered", question, actor="Evidence Assistant")


repository = AssessmentRepository()
