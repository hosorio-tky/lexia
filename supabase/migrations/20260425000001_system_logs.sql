CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  level text NOT NULL CHECK (level IN ('error','warn','info')),
  message text NOT NULL,
  path text,
  action text,
  user_id uuid,
  user_nombre text,
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_system_logs_tenant_created ON system_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level, created_at DESC);
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_system_logs" ON system_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tenant_id = system_logs.tenant_id AND rol IN ('admin','supervisor'))
);
