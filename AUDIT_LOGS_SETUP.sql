-- =============================================================
-- AUDIT LOGS TABLE
-- Tracks user logins, logouts, page navigations, and actions
-- across all sections of the Command Center
-- =============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT,
  action TEXT NOT NULL,           -- 'login', 'logout', 'page_view', 'action'
  section TEXT,                   -- view name, e.g. 'dashboard', 'api-monitoring'
  details TEXT,                   -- human-readable description
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries by time (default sort)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);

-- Index for filtering by user
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id, created_at DESC);

-- Index for filtering by action type
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action, created_at DESC);

-- Auto-cleanup: keep only last 90 days (optional, run via pg_cron or manually)
-- DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';

-- RLS: allow authenticated users to insert their own logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);
