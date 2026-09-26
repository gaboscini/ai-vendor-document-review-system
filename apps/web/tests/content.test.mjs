import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("review workspace exposes evidence and human decisions", () => {
  assert.match(page, /SOURCE EVIDENCE/);
  assert.match(page, /Accept Finding/);
  assert.match(page, /Reject Finding/);
  assert.match(page, /Evidence Assistant/);
});

test("the interface exposes evaluation and risk indicators", () => {
  assert.match(page, /Overall Risk/);
  assert.match(page, /Evaluation Pass Rate/);
  assert.match(page, /Deterministic Cases Evaluated/);
  assert.match(page, /Evaluation Set/);
});

test("all major controls have handlers or form behavior", () => {
  assert.match(page, /approveAssessment/);
  assert.match(page, /exportReport/);
  assert.match(page, /createAssessment/);
  assert.match(page, /markNotificationRead/);
  assert.match(page, /setFindingFilter/);
  assert.match(page, /setDocumentModal/);
});

test("enterprise branding and global preferences are implemented", () => {
  assert.match(page, /Vendor Assurance Hub/);
  assert.match(page, /BrandLogo/);
  assert.match(page, /Open Preferences/);
  assert.match(page, /document\.documentElement/);
  assert.match(page, /vendor-assurance-preferences/);
  assert.doesNotMatch(page, /ReviewAI/);
});
