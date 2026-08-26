CREATE VIEW v_profiles AS
SELECT
  p.*,
  cat.valor AS departamento
FROM profiles p
LEFT JOIN catalogos cat ON cat.id = p.departamento_id;

CREATE VIEW v_contratos AS
SELECT
  c.*,
  cat.valor AS tipo
FROM contratos c
LEFT JOIN catalogos cat ON cat.id = c.tipo_id;

NOTIFY pgrst, 'reload schema';