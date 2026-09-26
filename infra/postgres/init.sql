create extension if not exists vector;
create extension if not exists pgcrypto;

create type assessment_status as enum ('processing', 'ready_for_review', 'approved', 'changes_requested');
create type finding_severity as enum ('critical', 'high', 'medium', 'low');
create type review_decision as enum ('pending', 'accepted', 'rejected');

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  vendor_name text not null,
  service_name text not null,
  status assessment_status not null default 'processing',
  risk_score integer check (risk_score between 0 and 100),
  owner_id text not null,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  object_key text not null,
  original_name text not null,
  sha256 text not null,
  document_type text,
  status text not null default 'uploaded',
  page_count integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (assessment_id, sha256)
);

create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  page_number integer,
  section text,
  content text not null,
  content_tsv tsvector generated always as (to_tsvector('english', content)) stored,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb
);

create index document_chunks_embedding_idx on document_chunks using hnsw (embedding vector_cosine_ops);
create index document_chunks_text_idx on document_chunks using gin (content_tsv);
create index document_chunks_metadata_idx on document_chunks using gin (metadata);

create table control_requirements (
  id text primary key,
  framework text not null,
  title text not null,
  requirement text not null,
  weight numeric(5,2) not null default 1,
  active boolean not null default true
);

create table findings (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  control_id text not null references control_requirements(id),
  title text not null,
  severity finding_severity not null,
  status text not null check (status in ('gap', 'partial', 'met')),
  summary text not null,
  recommendation text not null,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  reviewer_decision review_decision not null default 'pending',
  reviewer_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table finding_evidence (
  finding_id uuid not null references findings(id) on delete cascade,
  chunk_id uuid not null references document_chunks(id) on delete cascade,
  quote text not null,
  relevance_score numeric(5,4) not null,
  primary key (finding_id, chunk_id)
);

create table ai_runs (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade,
  operation text not null,
  model text not null,
  prompt_version text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  latency_ms integer not null,
  estimated_cost_usd numeric(10,6) not null default 0,
  trace_id text,
  status text not null,
  created_at timestamptz not null default now()
);

create table evaluation_results (
  id uuid primary key default gen_random_uuid(),
  case_id text not null,
  run_id uuid references ai_runs(id),
  metric text not null,
  score numeric(5,4) not null,
  threshold numeric(5,4) not null,
  passed boolean not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table organizations enable row level security;
alter table assessments enable row level security;
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table findings enable row level security;
alter table finding_evidence enable row level security;
alter table ai_runs enable row level security;
alter table evaluation_results enable row level security;

