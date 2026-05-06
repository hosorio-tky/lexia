-- ============================================================
-- FIX: v_permisos debe heredar RLS de la tabla permisos
-- Sin security_invoker, la vista corre con permisos del dueño
-- (postgres) y bypasea las políticas RLS del usuario.
-- ============================================================

CREATE OR REPLACE VIEW v_permisos
  WITH (security_invoker = true)
AS
SELECT
  p.*,
  (p.fecha_vencimiento - current_date) AS dias_restantes,
  CASE
    WHEN p.fecha_vencimiento < current_date           THEN 'vencido'
    WHEN p.fecha_vencimiento <= current_date + 15     THEN 'critico'
    WHEN p.fecha_vencimiento <= current_date + 30     THEN 'advertencia'
    WHEN p.fecha_vencimiento <= current_date + 90     THEN 'proximo'
    ELSE 'vigente'
  END AS semaforo
FROM permisos p;
