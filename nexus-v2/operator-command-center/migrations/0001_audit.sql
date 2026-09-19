CREATE TABLE IF NOT EXISTS operator_audit (
  id TEXT PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  worker_id TEXT,
  request_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  detail_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_operator_audit_time
ON operator_audit(occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_operator_audit_worker
ON operator_audit(worker_id, occurred_at DESC);
