-- Durable queue for asynchronous chat turns (spec #90, ticket #91).
-- One row per logical turn; delivery is at-least-once and a worker claims a
-- row with a lease before executing the chat seam.
create table if not exists chat_jobs (
  job_id text primary key,
  -- Candidate ownership. Caller-supplied ownership is never trusted.
  candidate_id text not null,
  -- Client-supplied idempotency key; unique per candidate so a retry reuses the job.
  idempotency_key text not null,
  -- Chat session version the action was built against, used for per-candidate ordering.
  session_version integer not null,
  -- The validated chat action and message enqueued by the BFF.
  payload jsonb not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  -- Lease fields: a running job is reclaimed once its lease expires.
  lease_owner text,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz,
  trace_id text not null,
  request_id text not null,
  -- Completed ChatTurn for a succeeded job; never holds prompt or provider details.
  result jsonb,
  -- Terminal error fields for a failed job.
  error_code text,
  error_message text,
  error_retryable boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

alter table chat_jobs add column if not exists next_attempt_at timestamptz;

create unique index if not exists chat_jobs_idempotency_idx on chat_jobs (candidate_id, idempotency_key);
create index if not exists chat_jobs_claim_idx on chat_jobs (status, created_at);
create index if not exists chat_jobs_candidate_status_idx on chat_jobs (candidate_id, status);
create unique index if not exists chat_jobs_one_active_candidate_idx on chat_jobs (candidate_id) where status in ('queued', 'running');

create table if not exists chat_queue_metrics (
  metric_key text primary key default 'chat',
  attempts bigint not null default 0,
  worker_errors bigint not null default 0,
  dead_letters bigint not null default 0,
  session_conflicts bigint not null default 0,
  provider_timeouts bigint not null default 0,
  duration_seconds_total double precision not null default 0,
  duration_samples bigint not null default 0,
  oldest_alert_since timestamptz,
  error_alert_since timestamptz,
  updated_at timestamptz not null default now()
);
insert into chat_queue_metrics (metric_key) values ('chat') on conflict (metric_key) do nothing;
