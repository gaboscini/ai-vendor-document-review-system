import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const requiredFiles = [
  "README.md",
  "LICENSE",
  "SECURITY.md",
  ".env.example",
  "docker-compose.yml",
  "apps/api/app/main.py",
  "apps/web/app/page.tsx",
  "infra/postgres/init.sql",
  "data/evaluation-cases.json",
  "docs/ARCHITECTURE.md",
  "docs/SETUP.md",
  "docs/TESTING.md",
  "docs/DEMO_GUIDE.md",
  "docs/assets/vendor-assurance-hub-dashboard.png",
];

const failures = [];
for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) failures.push(`Missing required file: ${file}`);
}

const read = (file) => readFileSync(resolve(root, file), "utf8");
const sql = read("infra/postgres/init.sql");
const api = read("apps/api/app/main.py");
const ui = read("apps/web/app/page.tsx");
const readme = read("README.md");
const cases = JSON.parse(read("data/evaluation-cases.json"));

const checks = [
  [cases.length >= 4, "Evaluation dataset must contain at least four cases"],
  [/vector\s*\(/i.test(sql), "Schema must define vector embeddings"],
  [/hnsw/i.test(sql), "Schema must define an HNSW vector index"],
  [/enable row level security/i.test(sql), "Schema must enable row-level security"],
  [/\/questions/.test(api), "API must expose a grounded question endpoint"],
  [/\/decision/.test(api), "API must expose a human decision endpoint"],
  [/create_assessment/.test(api), "API must expose assessment creation"],
  [/upload_document/.test(api), "API must expose assessment document upload"],
  [/approve_assessment/.test(api), "API must expose assessment approval"],
  [/export_report/.test(api), "API must expose report export"],
  [/mark_notification_read/.test(api), "API must expose notification updates"],
  [/Evidence assistant/i.test(ui), "UI must expose the evidence assistant"],
  [/Accept Finding/i.test(ui), "UI must expose human finding acceptance"],
  [/createAssessment/.test(ui), "UI must connect assessment creation"],
  [/name="files"/.test(ui), "UI must collect vendor documents"],
  [/approveAssessment/.test(ui), "UI must connect assessment approval"],
  [/exportReport/.test(ui), "UI must connect report export"],
  [/```mermaid/.test(readme), "README must include an architecture diagram"],
  [/docs\/assets\/vendor-assurance-hub-dashboard\.png/.test(readme), "README must include the application screenshot"],
  [/github\.com\/gaboscini/.test(readme), "README must identify the public author"],
  [/docker compose up --build/.test(readme), "README must include a local run command"],
];

for (const [passed, message] of checks) {
  if (!passed) failures.push(message);
}

const publicFiles = ["README.md", "LICENSE", "SECURITY.md", "apps/web/app/page.tsx"];
const disallowed = [
  { pattern: /sk-proj-[A-Za-z0-9_-]{16,}/, label: "OpenAI API key" },
  { pattern: /AKIA[0-9A-Z]{16}/, label: "AWS access key" },
];

for (const file of publicFiles) {
  const contents = read(file);
  for (const { pattern, label } of disallowed) {
    if (pattern.test(contents)) failures.push(`${file} contains a ${label}`);
  }
}

if (failures.length) {
  console.error("Project validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Project validation passed: ${requiredFiles.length} required files and ${checks.length} architecture checks.`);
