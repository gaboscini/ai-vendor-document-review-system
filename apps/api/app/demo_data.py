from datetime import UTC, datetime, timedelta
from uuid import UUID

from .schemas import AssessmentDetail, Document, Evidence, Finding


ASSESSMENT_ID = UUID("11111111-1111-4111-8111-111111111111")


def build_demo_assessment() -> AssessmentDetail:
    now = datetime.now(UTC)
    evidence = {
        "encryption": Evidence(
            document_id="doc-security",
            document_name="Security Overview.pdf",
            page=8,
            section="Data Protection / Encryption",
            quote="Customer data is encrypted at rest using AES-256 and in transit using TLS 1.2 or later.",
        ),
        "retention": Evidence(
            document_id="doc-dpa",
            document_name="Data Processing Addendum.pdf",
            page=12,
            section="Deletion and Return",
            quote="Backups may be retained for up to 90 days following termination of services.",
        ),
        "incident": Evidence(
            document_id="doc-ir",
            document_name="Incident Response Policy.pdf",
            page=5,
            section="Customer Notification",
            quote="Affected customers will be notified without undue delay after confirmation of a security incident.",
        ),
        "subprocessors": Evidence(
            document_id="doc-dpa",
            document_name="Data Processing Addendum.pdf",
            page=7,
            section="Subprocessors",
            quote="The current subprocessor list is maintained on the provider trust portal.",
        ),
    }
    findings = [
        Finding(
            id="finding-1",
            control="IR-02",
            title="Incident-Notification Deadline Is Not Defined",
            severity="high",
            status="gap",
            summary="The incident-response policy commits to notification without undue delay but does not provide the required 24-hour notification window.",
            recommendation="Obtain a contractual commitment defining the maximum notification period.",
            confidence=0.96,
            evidence=[evidence["incident"]],
        ),
        Finding(
            id="finding-2",
            control="DP-07",
            title="Backup Retention Exceeds the Internal Target",
            severity="medium",
            status="partial",
            summary="The stated 90-day backup-retention period exceeds the 30-day internal requirement.",
            recommendation="Document a risk acceptance or negotiate a shorter deletion period.",
            confidence=0.93,
            evidence=[evidence["retention"]],
        ),
        Finding(
            id="finding-3",
            control="CR-04",
            title="Encryption Controls Are Supported",
            severity="low",
            status="met",
            summary="The vendor documents AES-256 encryption at rest and TLS 1.2 or later in transit.",
            recommendation="Verify implementation during technical onboarding.",
            confidence=0.98,
            evidence=[evidence["encryption"]],
        ),
        Finding(
            id="finding-4",
            control="TP-03",
            title="Subprocessor Evidence Is Externally Referenced",
            severity="medium",
            status="partial",
            summary="The DPA references a trust-portal list, but the submitted package does not contain the list or change-notification terms.",
            recommendation="Capture the current list and confirm advance notification for material changes.",
            confidence=0.89,
            evidence=[evidence["subprocessors"]],
        ),
    ]
    documents = [
        Document(id="doc-security", name="Security Overview.pdf", document_type="security_overview", pages=18, status="processed", controls_found=14, uploaded_at=now - timedelta(hours=3)),
        Document(id="doc-dpa", name="Data Processing Addendum.pdf", document_type="dpa", pages=16, status="processed", controls_found=11, uploaded_at=now - timedelta(hours=3)),
        Document(id="doc-ir", name="Incident Response Policy.pdf", document_type="incident_response", pages=9, status="processed", controls_found=8, uploaded_at=now - timedelta(hours=3)),
        Document(id="doc-questionnaire", name="Security Questionnaire.xlsx", document_type="questionnaire", pages=1, status="processed", controls_found=32, uploaded_at=now - timedelta(hours=3)),
    ]
    return AssessmentDetail(
        id=ASSESSMENT_ID,
        vendor_name="Demo Vendor",
        service="Customer Support Platform",
        status="ready_for_review",
        risk_score=67,
        risk_level="high",
        documents=len(documents),
        findings=len(findings),
        evidence_coverage=0.86,
        updated_at=now,
        owner="Security Review Team",
        due_date=now + timedelta(days=4),
        framework=["SOC 2", "ISO 27001", "Internal Vendor Standard"],
        document_items=documents,
        finding_items=findings,
    )
