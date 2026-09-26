export type Severity = "critical" | "high" | "medium" | "low";

export interface Finding {
  id: string;
  control: string;
  title: string;
  severity: Severity;
  status: "gap" | "partial" | "met";
  summary: string;
  recommendation: string;
  confidence: number;
  document: string;
  page: number;
  quote: string;
}

export interface AssessmentSummary {
  id: string;
  vendor_name: string;
  service: string;
  status: "processing" | "ready_for_review" | "approved" | "changes_requested";
  risk_score: number;
  risk_level: "low" | "moderate" | "high" | "critical";
  documents: number;
  findings: number;
  evidence_coverage: number;
  updated_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

export interface ActivityEvent {
  id: string;
  action: string;
  detail: string;
  actor: string;
  created_at: string;
}

export interface ControlRecord {
  id: string;
  name: string;
  category: string;
  status: "gap" | "partial" | "met";
  evidence_count: number;
  finding_id: string;
}

export interface EvaluationMetrics {
  answer_fact_accuracy: number;
  retrieval_recall_at_5: number;
  citation_precision: number;
  safe_abstention_rate: number;
  p95_latency_ms: number;
  evaluation_cases: number;
}
