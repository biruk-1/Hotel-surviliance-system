-- Per-user read state for alerts (sidebar badge, “seen” vs operational review).
CREATE TABLE IF NOT EXISTS alert_user_reads (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, alert_id)
);

CREATE INDEX IF NOT EXISTS idx_alert_user_reads_user ON alert_user_reads (user_id);
CREATE INDEX IF NOT EXISTS idx_alert_user_reads_alert ON alert_user_reads (alert_id);
