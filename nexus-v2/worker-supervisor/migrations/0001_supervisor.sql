PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS work_packets (
  worker_id TEXT PRIMARY KEY,
  phase TEXT NOT NULL,
  module TEXT NOT NULL,
  scope TEXT NOT NULL,
  branch TEXT NOT NULL UNIQUE,
  allowed_files_json TEXT NOT NULL,
  context_refs_json TEXT NOT NULL,
  acceptance_criteria_json TEXT NOT NULL,
  dependencies_json TEXT NOT NULL DEFAULT '[]',
  preferred_model TEXT,
  fallback_models_json TEXT NOT NULL DEFAULT '[]',
  budget_limit_micros INTEGER NOT NULL CHECK (budget_limit_micros >= 0),
  budget_consumed_micros INTEGER NOT NULL DEFAULT 0 CHECK (budget_consumed_micros >= 0),
  canonical_sha TEXT NOT NULL,
  state TEXT NOT NULL,
  checkpoint_sha TEXT,
  heartbeat_at TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  blocker_json TEXT,
  review_state TEXT NOT NULL DEFAULT 'NOT_SENT',
  active_execution_id TEXT,
  lease_expires_at TEXT,
  packet_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS supervisor_executions (
  execution_id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES work_packets(worker_id),
  idempotency_key TEXT NOT NULL UNIQUE,
  model_route TEXT,
  state TEXT NOT NULL,
  started_at TEXT NOT NULL,
  heartbeat_at TEXT,
  ended_at TEXT,
  checkpoint_sha TEXT,
  error_code TEXT,
  error_detail TEXT,
  acceptance_claim_json TEXT,
  FOREIGN KEY(worker_id) REFERENCES work_packets(worker_id)
);

CREATE TABLE IF NOT EXISTS supervisor_events (
  event_id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL,
  execution_id TEXT,
  occurred_at TEXT NOT NULL,
  event_type TEXT NOT NULL,
  detail_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS supervisor_cost_events (
  cost_event_id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL,
  execution_id TEXT,
  occurred_at TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  amount_micros INTEGER NOT NULL CHECK (amount_micros >= 0),
  source_event_id TEXT NOT NULL UNIQUE,
  detail_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_packets_state ON work_packets(state, phase);
CREATE INDEX IF NOT EXISTS idx_exec_worker ON supervisor_executions(worker_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_worker ON supervisor_events(worker_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_cost_worker ON supervisor_cost_events(worker_id, occurred_at DESC);
