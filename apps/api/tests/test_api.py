from fastapi.testclient import TestClient

from app.demo_data import ASSESSMENT_ID
from app.main import app
from app.repository import repository
from app.services.review_engine import ReviewEngine


client = TestClient(app)


def test_health() -> None:
    assert client.get("/health").json()["status"] == "ok"


def test_assessment_has_evidence_linked_findings() -> None:
    response = client.get(f"/api/v1/assessments/{ASSESSMENT_ID}")
    assert response.status_code == 200
    payload = response.json()
    assert payload["risk_level"] == "high"
    assert all(item["evidence"] for item in payload["finding_items"])


def test_question_returns_grounded_citation() -> None:
    response = client.post(
        f"/api/v1/assessments/{ASSESSMENT_ID}/questions",
        json={"question": "What is the incident notification deadline?"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["grounded"] is True
    assert payload["citations"][0]["document_name"] == "Incident Response Policy.pdf"


def test_human_decision_is_recorded() -> None:
    response = client.put(
        f"/api/v1/assessments/{ASSESSMENT_ID}/findings/finding-1/decision",
        json={"decision": "accepted", "note": "Confirmed during review"},
    )
    assert response.status_code == 200
    finding = next(item for item in response.json()["finding_items"] if item["id"] == "finding-1")
    assert finding["reviewer_decision"] == "accepted"


def test_included_evaluation_set_passes() -> None:
    response = client.get("/api/v1/evaluations/summary")
    assert response.status_code == 200
    payload = response.json()
    assert payload["evaluation_cases"] == 4
    assert payload["answer_fact_accuracy"] == 1.0
    assert payload["retrieval_recall_at_5"] == 1.0
    assert payload["citation_precision"] == 1.0
    assert payload["safe_abstention_rate"] == 1.0


def test_model_provider_receives_retrieved_evidence() -> None:
    class StubProvider:
        evidence_names: list[str] = []

        def generate(self, question, evidence, draft):
            self.evidence_names = [item.document_name for item in evidence]
            return f"Model checked: {draft}"

    provider = StubProvider()
    result = ReviewEngine(provider=provider).answer(repository.list()[0], "Which encryption standards are documented?")
    assert result.answer.startswith("Model checked:")
    assert provider.evidence_names == ["Security Overview.pdf"]


def test_complete_reviewer_workflow_endpoints() -> None:
    created = client.post(
        "/api/v1/assessments",
        json={"vendor_name": "Example Vendor", "service": "Payments Platform", "framework": ["SOC 2"]},
    )
    assert created.status_code == 201
    assert created.json()["status"] == "processing"
    upload = client.post(
        f"/api/v1/assessments/{created.json()['id']}/documents",
        files={"file": ("security-overview.txt", b"Synthetic vendor security evidence", "text/plain")},
    )
    assert upload.status_code == 201
    assert upload.json()["name"] == "security-overview.txt"

    approval = client.put(
        f"/api/v1/assessments/{ASSESSMENT_ID}/approve",
        json={"note": "Approved after evidence review"},
    )
    assert approval.status_code == 200
    assert approval.json()["status"] == "approved"

    report = client.get(f"/api/v1/assessments/{ASSESSMENT_ID}/report")
    assert report.status_code == 200
    assert "Vendor Security Assessment" in report.text
    assert "attachment" in report.headers["content-disposition"]

    assert client.get("/api/v1/controls").json()[0]["id"] == "IR-02"
    assert client.get("/api/v1/activities").status_code == 200
    assert client.get("/api/v1/review-queue").status_code == 200


def test_notification_and_document_endpoints() -> None:
    notifications = client.get("/api/v1/notifications").json()
    assert notifications
    updated = client.put(f"/api/v1/notifications/{notifications[0]['id']}/read")
    assert updated.status_code == 200
    assert updated.json()["read"] is True

    document = client.get(f"/api/v1/assessments/{ASSESSMENT_ID}/documents/doc-security")
    assert document.status_code == 200
    assert document.json()["name"] == "Security Overview.pdf"
