-- Onboarding checklist state per tenant
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS onboarding_steps       jsonb        DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_dismissed_at timestamptz DEFAULT NULL;
