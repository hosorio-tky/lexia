-- Drop workaround views (no longer needed; repositories use PostgREST embedded joins directly)
DROP VIEW IF EXISTS v_profiles;
DROP VIEW IF EXISTS v_contratos;
