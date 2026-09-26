"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { documents, findings } from "@/lib/demo-data";
import { DEFAULT_PREFERENCES, normalizePreferences, resolveTheme, serializePreferences, type AccentPreference, type DensityPreference, type Preferences, type ThemePreference } from "@/lib/preferences.mjs";
import type { ActivityEvent, AssessmentSummary, ControlRecord, EvaluationMetrics, Finding, NotificationItem } from "@/lib/types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const assessmentId = "11111111-1111-4111-8111-111111111111";
const tabs = ["Overview", "Findings", "Documents", "Assistant", "Evaluations"] as const;
type View = typeof tabs[number] | "Assessments" | "Control Library" | "Review Queue" | "AI Activity";
type Message = { role: "assistant" | "user"; text: string; source?: string; documentId?: string };

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    spark: <><path d="m12 3-1.7 4.3L6 9l4.3 1.7L12 15l1.7-4.3L18 9l-4.3-1.7L12 3Z"/><path d="m5 15-.9 2.1L2 18l2.1.9L5 21l.9-2.1L8 18l-2.1-.9L5 15Z"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    check: <path d="m5 12 4 4L19 6"/>, chevron: <path d="m9 18 6-6-6-6"/>,
    upload: <><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 20h16"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/></>,
    close: <><path d="m6 6 12 12"/><path d="m18 6-12 12"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.95 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.58 15 1.7 1.7 0 0 0 3 14H3v-4h.08A1.7 1.7 0 0 0 4.6 8.95a1.7 1.7 0 0 0-.34-1.88L4.2 7l2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.58 1.7 1.7 0 0 0 10 3h4v.08A1.7 1.7 0 0 0 15.05 4.6a1.7 1.7 0 0 0 1.88-.34L17 4.2 19.83 7l-.06.06A1.7 1.7 0 0 0 19.42 9 1.7 1.7 0 0 0 21 10h.08v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function BrandLogo() {
  return <svg className="brand-logo" viewBox="0 0 40 40" role="img" aria-label="Vendor Assurance Hub Logo"><path className="logo-shield" d="M20 3.5 33 8v10.1c0 8.4-5.2 14.7-13 18.4-7.8-3.7-13-10-13-18.4V8l13-4.5Z"/><path className="logo-page" d="M14 11.5h9l4 4V27H14V11.5Z"/><path className="logo-fold" d="M23 11.5V16h4"/><path className="logo-check" d="m16.8 21 2.2 2.2 4.7-5"/></svg>;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function Severity({ value }: { value: Finding["severity"] }) {
  return <span className={`severity ${value}`}><i />{titleCase(value)}</span>;
}

function RiskRing({ score }: { score: number }) {
  return <div className="risk-ring" aria-label={`Risk Score ${score} out of 100`}><svg viewBox="0 0 120 120"><circle className="ring-track" cx="60" cy="60" r="50"/><circle className="ring-value" cx="60" cy="60" r="50" pathLength="100" style={{ strokeDasharray: `${score} 100` }}/></svg><div><strong>{score}</strong><span>/ 100</span></div></div>;
}

export default function ReviewWorkspace() {
  const [view, setView] = useState<View>("Overview");
  const [selectedId, setSelectedId] = useState(findings[0].id);
  const [decisions, setDecisions] = useState<Record<string, "accepted" | "rejected">>({});
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "Ask Me About the Submitted Evidence, Controls, or Unresolved Risks." }]);
  const [search, setSearch] = useState("");
  const [findingFilter, setFindingFilter] = useState("all");
  const [evidenceOpen, setEvidenceOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [controls, setControls] = useState<ControlRecord[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null);
  const [status, setStatus] = useState("ready_for_review");
  const [apiOnline, setApiOnline] = useState(false);
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");
  const [newAssessmentOpen, setNewAssessmentOpen] = useState(false);
  const [assessmentModal, setAssessmentModal] = useState<AssessmentSummary | null>(null);
  const [documentModal, setDocumentModal] = useState<{ id: string; name: string; page?: number; quote?: string } | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({ ...DEFAULT_PREFERENCES });
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = useMemo(() => findings.find((item) => item.id === selectedId) ?? findings[0], [selectedId]);
  const visibleFindings = useMemo(() => findings.filter((item) => {
    const matchesFilter = findingFilter === "all" || item.severity === findingFilter || item.status === findingFilter;
    const term = search.toLowerCase();
    return matchesFilter && (!term || `${item.control} ${item.title} ${item.document}`.toLowerCase().includes(term));
  }), [findingFilter, search]);

  async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${apiUrl}${path}`, options);
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.detail ?? `Request Failed (${response.status})`);
    return response.json();
  }

  async function refreshData() {
    try {
      const [assessmentList, notificationList, controlList, activityList, evaluation] = await Promise.all([
        request<AssessmentSummary[]>("/api/v1/assessments"), request<NotificationItem[]>("/api/v1/notifications"),
        request<ControlRecord[]>("/api/v1/controls"), request<ActivityEvent[]>("/api/v1/activities"),
        request<EvaluationMetrics>("/api/v1/evaluations/summary"),
      ]);
      setAssessments(assessmentList); setNotifications(notificationList); setControls(controlList); setActivities(activityList); setMetrics(evaluation);
      setStatus(assessmentList.find((item) => item.id === assessmentId)?.status ?? "ready_for_review"); setApiOnline(true);
    } catch { setApiOnline(false); }
  }

  useEffect(() => { void refreshData(); }, []);
  useEffect(() => {
    try { setPreferences(normalizePreferences(JSON.parse(window.localStorage.getItem("vendor-assurance-preferences") ?? "null"))); }
    catch { setPreferences({ ...DEFAULT_PREFERENCES }); }
    setPreferencesLoaded(true);
  }, []);
  useEffect(() => {
    if (!preferencesLoaded) return;
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolvedTheme = resolveTheme(preferences.theme, media.matches);
      root.dataset.theme = resolvedTheme;
      root.dataset.accent = preferences.accent;
      root.dataset.density = preferences.density;
      root.style.colorScheme = resolvedTheme;
    };
    apply();
    window.localStorage.setItem("vendor-assurance-preferences", serializePreferences(preferences));
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preferences, preferencesLoaded]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "/" && document.activeElement?.tagName !== "INPUT") { event.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3200); return () => window.clearTimeout(timer); }, [toast]);

  function showToast(message: string) { setToast(message); }
  function openFinding(item: Finding) { setSelectedId(item.id); setEvidenceOpen(true); setView("Findings"); }

  async function decide(value: "accepted" | "rejected") {
    setBusy(`decision-${value}`);
    try {
      await request(`/api/v1/assessments/${assessmentId}/findings/${selected.id}/decision`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision: value, note: "Recorded in the Reviewer Workspace" }) });
      setDecisions((current) => ({ ...current, [selected.id]: value })); showToast(`Finding ${titleCase(value)} Successfully.`); await refreshData();
    } catch (error) { showToast(error instanceof Error ? error.message : "Decision Failed."); }
    finally { setBusy(""); }
  }

  async function approveAssessment() {
    setBusy("approve");
    try {
      const result = await request<AssessmentSummary>(`/api/v1/assessments/${assessmentId}/approve`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: "Approved After Evidence Review" }) });
      setStatus(result.status); showToast("Assessment Approved Successfully."); await refreshData();
    } catch (error) { showToast(error instanceof Error ? error.message : "Approval Failed."); }
    finally { setBusy(""); }
  }

  async function exportReport() {
    setBusy("export");
    try {
      const response = await fetch(`${apiUrl}/api/v1/assessments/${assessmentId}/report`);
      if (!response.ok) throw new Error("Report Export Failed.");
      const url = URL.createObjectURL(await response.blob()); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = "demo-vendor-assessment.md"; anchor.click(); URL.revokeObjectURL(url); showToast("Assessment Report Downloaded.");
    } catch (error) { showToast(error instanceof Error ? error.message : "Report Export Failed."); }
    finally { setBusy(""); }
  }

  async function ask() {
    if (!question.trim() || busy === "question") return;
    const submitted = question.trim(); setQuestion(""); setMessages((current) => [...current, { role: "user", text: submitted }]); setBusy("question");
    try {
      const result = await request<{ answer: string; citations: Array<{ document_id: string; document_name: string; page?: number }> }>(`/api/v1/assessments/${assessmentId}/questions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: submitted }) });
      const citation = result.citations[0]; setMessages((current) => [...current, { role: "assistant", text: result.answer, source: citation ? `${citation.document_name} · Page ${citation.page ?? "N/A"}` : "No Supporting Citation", documentId: citation?.document_id }]); await refreshData();
    } catch (error) { setMessages((current) => [...current, { role: "assistant", text: error instanceof Error ? error.message : "The Evidence Assistant Is Unavailable." }]); }
    finally { setBusy(""); }
  }

  async function markNotificationRead(item: NotificationItem) {
    try { const updated = await request<NotificationItem>(`/api/v1/notifications/${item.id}/read`, { method: "PUT" }); setNotifications((current) => current.map((entry) => entry.id === updated.id ? updated : entry)); }
    catch (error) { showToast(error instanceof Error ? error.message : "Notification Update Failed."); }
  }

  async function createAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy("create");
    try {
      const created = await request<AssessmentSummary>("/api/v1/assessments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vendor_name: data.get("vendor"), service: data.get("service"), framework: [data.get("framework")] }) });
      const files = data.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
      for (const file of files) {
        const upload = new FormData(); upload.append("file", file);
        const response = await fetch(`${apiUrl}/api/v1/assessments/${created.id}/documents`, { method: "POST", body: upload });
        if (!response.ok) throw new Error(`Document Upload Failed for ${file.name}.`);
      }
      setAssessments((current) => [...current, created]); setNewAssessmentOpen(false); setView("Assessments"); showToast(`New Assessment Created With ${files.length} Document${files.length === 1 ? "" : "s"}.`); await refreshData();
    } catch (error) { showToast(error instanceof Error ? error.message : "Assessment Creation Failed."); }
    finally { setBusy(""); }
  }

  const sidebar = [
    { label: "Assessments", icon: "grid", badge: assessments.length || 1 }, { label: "Documents", icon: "file" },
    { label: "Control Library", icon: "shield" }, { label: "Evaluations", icon: "chart" },
  ];
  const operations = [{ label: "Review Queue", icon: "clock", badge: assessments.filter((item) => item.status === "ready_for_review").length || 1 }, { label: "AI Activity", icon: "spark" }];
  const unread = notifications.filter((item) => !item.read).length;

  return <main className="shell">
    <aside className="sidebar">
      <button className="brand brand-button" onClick={() => setView("Overview")}><span className="brand-mark"><BrandLogo/></span><div><b>Vendor Assurance Hub</b><small>AI Evidence Workspace</small></div></button>
      <nav><p>Workspace</p>{sidebar.map((item) => <button className={view === item.label ? "active" : ""} key={item.label} onClick={() => setView(item.label as View)}><Icon name={item.icon}/><span>{item.label}</span>{item.badge !== undefined && <em>{item.badge}</em>}</button>)}<p>Operations</p>{operations.map((item) => <button className={view === item.label ? "active" : ""} key={item.label} onClick={() => setView(item.label as View)}><Icon name={item.icon}/><span>{item.label}</span>{item.badge !== undefined && <em className="warn">{item.badge}</em>}</button>)}</nav>
      <div className="sidebar-footer"><div className="avatar">SC</div><div><b>Security Reviewer</b><small>Reviewer Role</small></div><button className="preferences-button" onClick={() => setPreferencesOpen(true)} aria-label="Open Preferences" title="Preferences"><Icon name="settings" size={17}/></button></div>
    </aside>

    <section className="content">
      <header className="topbar">
        <label className="search"><Icon name="search"/><input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Assessments, Findings, or Controls"/><kbd>/</kbd></label>
        <span className={`api-status ${apiOnline ? "online" : "offline"}`}>{apiOnline ? "API Online" : "API Offline"}</span>
        <div className="popover-anchor"><button className="icon-button" aria-label="Notifications" onClick={() => setNotificationsOpen((open) => !open)}><Icon name="bell"/>{unread > 0 && <i/>}</button>{notificationsOpen && <div className="notification-popover"><div className="popover-title"><b>Notifications</b><span>{unread} Unread</span></div>{notifications.map((item) => <button key={item.id} className={item.read ? "read" : ""} onClick={() => void markNotificationRead(item)}><b>{item.title}</b><span>{item.message}</span><small>{item.read ? "Read" : "Mark as Read"}</small></button>)}</div>}</div>
        <button className="primary" onClick={() => setNewAssessmentOpen(true)}><Icon name="upload"/>New Assessment</button>
      </header>

      <div className="page">
        <div className="breadcrumbs">Assessments <Icon name="chevron" size={14}/> Demo Vendor</div>
        <div className="hero-row"><div><div className="eyebrow"><span>{titleCase(status)}</span><span className="dot">•</span>Updated Just Now</div><h1>Vendor Security Assessment</h1><p>Customer Support Platform <span>·</span> SOC 2, ISO 27001, Internal Vendor Standard</p></div><div className="hero-actions"><button className="secondary" onClick={() => void exportReport()} disabled={busy === "export"}><Icon name="download" size={15}/>{busy === "export" ? "Exporting…" : "Export Report"}</button><button className="approve" onClick={() => void approveAssessment()} disabled={status === "approved" || busy === "approve"}><Icon name="check"/>{status === "approved" ? "Assessment Approved" : busy === "approve" ? "Approving…" : "Approve Assessment"}</button></div></div>
        <div className="tabs">{tabs.map((item) => <button key={item} onClick={() => setView(item)} className={view === item ? "active" : ""}>{item}{item === "Findings" && <span>{findings.length}</span>}</button>)}</div>

        {view === "Overview" && <Overview score={67} metrics={metrics} onOpenFinding={openFinding} onDocuments={() => setView("Documents")} onAssistant={() => setView("Assistant")}/>} 
        {view === "Findings" && <FindingsView items={visibleFindings} selected={selected} decisions={decisions} filter={findingFilter} setFilter={setFindingFilter} evidenceOpen={evidenceOpen} onSelect={openFinding} onClose={() => setEvidenceOpen(false)} onDocument={() => setDocumentModal({ id: selected.id, name: selected.document, page: selected.page, quote: selected.quote })} onDecision={decide} busy={busy}/>} 
        {view === "Documents" && <DocumentsView onOpen={(doc) => setDocumentModal({ id: doc.name, name: doc.name })}/>} 
        {view === "Assistant" && <AssistantView messages={messages} question={question} setQuestion={setQuestion} ask={ask} busy={busy} onSource={(message) => setDocumentModal({ id: message.documentId ?? "source", name: message.source ?? "Source Evidence", quote: message.text })}/>} 
        {view === "Evaluations" && <EvaluationsView metrics={metrics}/>} 
        {view === "Assessments" && <AssessmentsView assessments={assessments} search={search} onOpen={(item) => item.id === assessmentId ? setView("Overview") : setAssessmentModal(item)}/>} 
        {view === "Control Library" && <ControlsView controls={controls} search={search} onOpen={(control) => { const finding = findings.find((item) => item.id === control.finding_id); if (finding) openFinding(finding); }}/>} 
        {view === "Review Queue" && <AssessmentsView assessments={assessments.filter((item) => item.status === "ready_for_review" || item.status === "changes_requested")} search={search} onOpen={(item) => item.id === assessmentId ? setView("Overview") : setAssessmentModal(item)} queue/>} 
        {view === "AI Activity" && <ActivityView activities={activities}/>} 

        <footer><span><i/>All AI Outputs Require Human Approval</span><span>Evaluation Set: {metrics?.evaluation_cases ?? 4} Cases · Last Run: Today</span></footer>
      </div>
    </section>

    {newAssessmentOpen && <div className="modal-backdrop"><form className="modal" onSubmit={createAssessment}><div className="modal-header"><div><small>NEW ASSESSMENT</small><h2>Create Vendor Assessment</h2></div><button type="button" className="close-button" onClick={() => setNewAssessmentOpen(false)} aria-label="Close"><Icon name="close"/></button></div><label>Vendor Name<input name="vendor" required minLength={2} placeholder="Example Vendor"/></label><label>Service<input name="service" required minLength={2} placeholder="Customer Support Platform"/></label><label>Primary Framework<select name="framework"><option>SOC 2</option><option>ISO 27001</option><option>Internal Vendor Standard</option></select></label><label>Vendor Documents<input name="files" type="file" multiple required accept=".pdf,.docx,.xlsx,.txt,.md"/><small className="field-help">PDF, DOCX, XLSX, TXT, or Markdown · 20 MB Maximum per File</small></label><div className="modal-actions"><button type="button" className="secondary" onClick={() => setNewAssessmentOpen(false)}>Cancel</button><button className="primary" disabled={busy === "create"}>{busy === "create" ? "Creating…" : "Create Assessment"}</button></div></form></div>}
    {documentModal && <div className="modal-backdrop"><div className="modal document-modal"><div className="modal-header"><div><small>SOURCE DOCUMENT</small><h2>{documentModal.name}</h2></div><button className="close-button" onClick={() => setDocumentModal(null)} aria-label="Close"><Icon name="close"/></button></div><div className="document-preview"><Icon name="file" size={32}/><b>{documentModal.page ? `Page ${documentModal.page}` : "Processed Document"}</b><p>{documentModal.quote ?? "Document metadata, processing status, page count, and mapped controls are available for reviewer inspection."}</p></div><div className="modal-actions"><button className="primary" onClick={() => setDocumentModal(null)}>Close Document</button></div></div></div>}
    {assessmentModal && <div className="modal-backdrop"><div className="modal"><div className="modal-header"><div><small>ASSESSMENT STATUS</small><h2>{assessmentModal.vendor_name}</h2></div><button className="close-button" onClick={() => setAssessmentModal(null)} aria-label="Close"><Icon name="close"/></button></div><div className="summary-grid"><div><small>Service</small><b>{assessmentModal.service}</b></div><div><small>Status</small><b>{titleCase(assessmentModal.status)}</b></div><div><small>Documents</small><b>{assessmentModal.documents}</b></div><div><small>Findings</small><b>{assessmentModal.findings}</b></div></div><p className="modal-note">Processing assessments become reviewable after document extraction and control mapping complete.</p><div className="modal-actions"><button className="primary" onClick={() => setAssessmentModal(null)}>Close Assessment</button></div></div></div>}
    {preferencesOpen && <PreferencesModal preferences={preferences} onChange={setPreferences} onClose={() => setPreferencesOpen(false)}/>} 
    {toast && <div className="toast" role="status"><Icon name="check"/>{toast}</div>}
  </main>;
}

function PreferencesModal({ preferences, onChange, onClose }: { preferences: Preferences; onChange: (value: Preferences) => void; onClose: () => void }) {
  const themes: Array<{ value: ThemePreference; label: string; description: string }> = [
    { value: "light", label: "Light", description: "Bright workspace" }, { value: "dark", label: "Dark", description: "Reduced glare" }, { value: "system", label: "System", description: "Match device" },
  ];
  const accents: Array<{ value: AccentPreference; label: string }> = [{ value: "blue", label: "Blue" }, { value: "violet", label: "Violet" }, { value: "teal", label: "Teal" }];
  const densities: Array<{ value: DensityPreference; label: string; description: string }> = [{ value: "comfortable", label: "Comfortable", description: "More space between content" }, { value: "compact", label: "Compact", description: "See more information at once" }];
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="modal preferences-modal" role="dialog" aria-modal="true" aria-labelledby="preferences-title"><div className="modal-header"><div><small>WORKSPACE SETTINGS</small><h2 id="preferences-title">Preferences</h2><p>Changes Apply Across the Entire Workspace and Are Saved on This Device.</p></div><button className="close-button" onClick={onClose} aria-label="Close Preferences"><Icon name="close"/></button></div><fieldset><legend>Appearance</legend><div className="preference-grid theme-options">{themes.map((item) => <button type="button" key={item.value} className={preferences.theme === item.value ? "selected" : ""} onClick={() => onChange({ ...preferences, theme: item.value })} aria-pressed={preferences.theme === item.value}><span className={`theme-preview ${item.value}`}><i/><i/><i/></span><b>{item.label}</b><small>{item.description}</small></button>)}</div></fieldset><fieldset><legend>Accent Color</legend><div className="accent-options">{accents.map((item) => <button type="button" key={item.value} className={preferences.accent === item.value ? "selected" : ""} onClick={() => onChange({ ...preferences, accent: item.value })} aria-pressed={preferences.accent === item.value}><i className={item.value}/><span>{item.label}</span>{preferences.accent === item.value && <Icon name="check" size={14}/>}</button>)}</div></fieldset><fieldset><legend>Display Density</legend><div className="preference-grid density-options">{densities.map((item) => <button type="button" key={item.value} className={preferences.density === item.value ? "selected" : ""} onClick={() => onChange({ ...preferences, density: item.value })} aria-pressed={preferences.density === item.value}><b>{item.label}</b><small>{item.description}</small></button>)}</div></fieldset><div className="modal-actions"><button className="secondary" onClick={() => onChange({ ...DEFAULT_PREFERENCES })}>Restore Defaults</button><button className="primary" onClick={onClose}>Done</button></div></section></div>;
}

function Overview({ score, metrics, onOpenFinding, onDocuments, onAssistant }: { score: number; metrics: EvaluationMetrics | null; onOpenFinding: (item: Finding) => void; onDocuments: () => void; onAssistant: () => void }) {
  return <><section className="metrics-grid"><article className="metric risk"><div><small>Overall Risk</small><h2>High</h2><p>Human Review Required</p></div><RiskRing score={score}/></article><article className="metric"><small>Control Coverage</small><h2>86%</h2><div className="progress"><i style={{ width: "86%" }}/></div><p><b>56</b> of 65 Controls Have Evidence</p></article><article className="metric"><small>Open Findings</small><h2>3</h2><div className="finding-dots"><span className="high">1 High</span><span className="medium">2 Medium</span></div><p>1 Control Fully Supported</p></article><article className="metric"><small>Evaluation Pass Rate</small><h2>{metrics ? `${Math.round(metrics.answer_fact_accuracy * 100)}%` : "100%"}</h2><div className="progress blue"><i style={{ width: `${(metrics?.answer_fact_accuracy ?? 1) * 100}%` }}/></div><p>{metrics?.evaluation_cases ?? 4} Deterministic Cases Evaluated</p></article></section><section className="workspace-grid"><div className="panel findings-panel"><div className="panel-title"><div><h3>Priority Findings</h3><p>AI-Generated Findings Linked to Source Evidence</p></div><button className="link" onClick={() => onOpenFinding(findings[0])}>Review All</button></div><div className="finding-list">{findings.slice(0, 3).map((item) => <FindingRow key={item.id} item={item} selected={false} onSelect={() => onOpenFinding(item)}/>)}</div></div><div className="panel quick-actions"><div className="panel-title"><div><h3>Reviewer Actions</h3><p>Continue the Assessment Workflow</p></div></div><button onClick={onDocuments}><Icon name="file"/><span><b>Review Documents</b><small>Inspect Submitted Evidence</small></span><Icon name="chevron"/></button><button onClick={onAssistant}><Icon name="spark"/><span><b>Ask Evidence Assistant</b><small>Query Grounded Sources</small></span><Icon name="chevron"/></button></div></section></>;
}

function FindingRow({ item, selected, decision, onSelect }: { item: Finding; selected: boolean; decision?: string; onSelect: () => void }) {
  return <button className={`finding-row ${selected ? "selected" : ""}`} onClick={onSelect}><div className={`finding-icon ${item.status}`}><Icon name={item.status === "met" ? "check" : "shield"}/></div><div className="finding-copy"><div><code>{item.control}</code><Severity value={item.severity}/>{decision && <span className={`decision ${decision}`}>{titleCase(decision)}</span>}</div><h4>{item.title}</h4><p>{item.summary}</p><small>{item.document} · Page {item.page}</small></div><Icon name="chevron"/></button>;
}

function FindingsView({ items, selected, decisions, filter, setFilter, evidenceOpen, onSelect, onClose, onDocument, onDecision, busy }: { items: Finding[]; selected: Finding; decisions: Record<string, string>; filter: string; setFilter: (value: string) => void; evidenceOpen: boolean; onSelect: (item: Finding) => void; onClose: () => void; onDocument: () => void; onDecision: (value: "accepted" | "rejected") => Promise<void>; busy: string }) {
  return <section className={`workspace-grid ${!evidenceOpen ? "single-column" : ""}`}><div className="panel findings-panel"><div className="panel-title"><div><h3>Review Findings</h3><p>Filter, Inspect, and Decide Every Finding</p></div><select className="filter" value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter Findings"><option value="all">All Findings</option><option value="high">High Severity</option><option value="medium">Medium Severity</option><option value="met">Supported Controls</option></select></div><div className="finding-list">{items.length ? items.map((item) => <FindingRow key={item.id} item={item} selected={selected.id === item.id} decision={decisions[item.id]} onSelect={() => onSelect(item)}/>) : <div className="empty-state">No Findings Match the Current Filter.</div>}</div></div>{evidenceOpen && <aside className="panel evidence-panel"><div className="evidence-head"><div><span className="ai-badge"><Icon name="spark" size={14}/>AI FINDING</span><h3>{selected.title}</h3></div><button onClick={onClose} aria-label="Close Evidence"><Icon name="close"/></button></div><div className="confidence"><span>Confidence</span><b>{Math.round(selected.confidence * 100)}%</b><div><i style={{ width: `${selected.confidence * 100}%` }}/></div></div><div className="evidence-section"><small>WHY THIS MATTERS</small><p>{selected.summary}</p></div><div className="evidence-section"><small>SOURCE EVIDENCE</small><div className="source-card"><div><Icon name="file"/><span><b>{selected.document}</b><small>Page {selected.page} · Verified Extraction</small></span></div><blockquote>“{selected.quote}”</blockquote><button onClick={onDocument}>Open in Document <Icon name="chevron" size={14}/></button></div></div><div className="evidence-section"><small>RECOMMENDED ACTION</small><p>{selected.recommendation}</p></div><div className="decision-actions"><button disabled={busy.startsWith("decision")} onClick={() => void onDecision("rejected")}>Reject Finding</button><button disabled={busy.startsWith("decision")} onClick={() => void onDecision("accepted")}><Icon name="check"/>Accept Finding</button></div></aside>}</section>;
}

function DocumentsView({ onOpen }: { onOpen: (doc: typeof documents[number]) => void }) { return <section className="panel full-panel"><div className="panel-title"><div><h3>Submitted Documents</h3><p>Four Processed Files With 65 Mapped Controls</p></div></div><div className="document-grid">{documents.map((doc) => <button className="document-card" key={doc.name} onClick={() => onOpen(doc)}><div className="doc-icon"><Icon name="file"/></div><div><b>{doc.name}</b><small>{titleCase(doc.type)} · {doc.pages} Pages</small></div><span>{doc.controls} Controls</span><i><Icon name="check" size={14}/></i></button>)}</div></section>; }

function AssistantView({ messages, question, setQuestion, ask, busy, onSource }: { messages: Message[]; question: string; setQuestion: (value: string) => void; ask: () => Promise<void>; busy: string; onSource: (message: Message) => void }) { return <section className="panel full-panel assistant-full"><div className="assistant-title"><span><Icon name="spark"/></span><div><h3>Evidence Assistant</h3><p>Answers Are Restricted to Submitted Evidence</p></div><i>Grounded</i></div><div className="chat">{messages.map((message, index) => <div key={index} className={`message ${message.role}`}><p>{message.text}</p>{message.source && <button onClick={() => onSource(message)}><Icon name="file" size={13}/>{message.source}</button>}</div>)}</div><div className="composer"><input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void ask(); }} placeholder="Ask About Controls, Evidence, or Risks…"/><button disabled={busy === "question"} onClick={() => void ask()} aria-label="Send Question"><Icon name="send"/></button></div></section>; }

function EvaluationsView({ metrics }: { metrics: EvaluationMetrics | null }) { const cards = [{ label: "Answer Fact Accuracy", value: metrics?.answer_fact_accuracy }, { label: "Retrieval Recall at 5", value: metrics?.retrieval_recall_at_5 }, { label: "Citation Precision", value: metrics?.citation_precision }, { label: "Safe Abstention Rate", value: metrics?.safe_abstention_rate }]; return <section className="panel full-panel"><div className="panel-title"><div><h3>AI Evaluation Results</h3><p>Executable Grounding, Retrieval, Citation, and Abstention Checks</p></div><span className="status-pill met">{metrics?.evaluation_cases ?? 4} Cases</span></div><div className="evaluation-grid">{cards.map((card) => <article key={card.label}><small>{card.label}</small><strong>{card.value === undefined ? "—" : `${Math.round(card.value * 100)}%`}</strong><div className="progress"><i style={{ width: `${(card.value ?? 0) * 100}%` }}/></div></article>)}<article><small>P95 Evaluation Latency</small><strong>{metrics ? `${metrics.p95_latency_ms} ms` : "—"}</strong><p>Measured by the Backend Evaluation Runner</p></article></div></section>; }

function AssessmentsView({ assessments, search, onOpen, queue = false }: { assessments: AssessmentSummary[]; search: string; onOpen: (item: AssessmentSummary) => void; queue?: boolean }) { const shown = assessments.filter((item) => `${item.vendor_name} ${item.service}`.toLowerCase().includes(search.toLowerCase())); return <section className="panel full-panel"><div className="panel-title"><div><h3>{queue ? "Human Review Queue" : "Vendor Assessments"}</h3><p>{queue ? "Assessments Requiring Reviewer Action" : "All Active and Completed Assessments"}</p></div><span className="status-pill">{shown.length} Records</span></div><div className="table-list">{shown.map((item) => <button key={item.id} onClick={() => onOpen(item)}><div><b>{item.vendor_name}</b><small>{item.service}</small></div><span className={`status-pill ${item.status}`}>{titleCase(item.status)}</span><span>{item.risk_score}/100 Risk</span><span>{item.findings} Findings</span><Icon name="chevron"/></button>)}{!shown.length && <div className="empty-state">No Assessments Match the Current Search.</div>}</div></section>; }

function ControlsView({ controls, search, onOpen }: { controls: ControlRecord[]; search: string; onOpen: (control: ControlRecord) => void }) { const shown = controls.filter((item) => `${item.id} ${item.name} ${item.category}`.toLowerCase().includes(search.toLowerCase())); return <section className="panel full-panel"><div className="panel-title"><div><h3>Control Library</h3><p>Mapped Requirements, Evidence, and Current Status</p></div><span className="status-pill">{shown.length} Controls</span></div><div className="control-grid">{shown.map((control) => <button key={control.id} onClick={() => onOpen(control)}><code>{control.id}</code><div><b>{control.name}</b><small>{control.category}</small></div><span className={`status-pill ${control.status}`}>{titleCase(control.status)}</span><small>{control.evidence_count} Evidence Source</small><Icon name="chevron"/></button>)}</div></section>; }

function ActivityView({ activities }: { activities: ActivityEvent[] }) { return <section className="panel full-panel"><div className="panel-title"><div><h3>AI Activity</h3><p>Auditable Review and Decision Events</p></div></div><div className="activity-list">{activities.map((item) => <article key={item.id}><span><Icon name="spark"/></span><div><b>{item.action}</b><p>{item.detail}</p><small>{item.actor} · {new Date(item.created_at).toLocaleString()}</small></div></article>)}</div></section>; }
