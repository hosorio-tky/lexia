-- Recreate v_permisos adding visibilidad column and notify PostgREST to refresh schema cache
DROP VIEW IF EXISTS v_permisos;

CREATE VIEW v_permisos AS
SELECT
  p.id,
  p.tenant_id,
  p.numero_expediente,
  p.nombre,
  p.descripcion,
  tipo_cat.valor                  AS tipo,
  entidad_cat.valor               AS entidad_reguladora,
  p.tipo_id,
  p.entidad_reguladora_id,
  p.ubicacion,
  p.estado,
  p.fecha_solicitud,
  p.fecha_emision,
  p.fecha_vencimiento,
  p.responsable_id,
  p.responsable_nombre,
  p.created_by,
  p.updated_by,
  p.created_at,
  p.updated_at,
  p.ubicacion_id,
  p.valor_tramite,
  p.moneda,
  p.base_legal,
  p.riesgo_incumplimiento,
  p.base_legal_incumplimiento,
  p.tiene_provisional,
  p.fecha_emision_provisional,
  p.fecha_vencimiento_provisional,
  p.visibilidad,
  p.fecha_vencimiento - CURRENT_DATE AS dias_restantes,
  CASE
    WHEN p.fecha_vencimiento < CURRENT_DATE          THEN 'vencido'
    WHEN p.fecha_vencimiento <= (CURRENT_DATE + 15)  THEN 'critico'
    WHEN p.fecha_vencimiento <= (CURRENT_DATE + 30)  THEN 'advertencia'
    WHEN p.fecha_vencimiento <= (CURRENT_DATE + 90)  THEN 'proximo'
    ELSE 'vigente'
  END AS semaforo
FROM permisos p
LEFT JOIN catalogos tipo_cat    ON tipo_cat.id    = p.tipo_id
LEFT JOIN catalogos entidad_cat ON entidad_cat.id = p.entidad_reguladora_id;

NOTIFY pgrst, 'reload schema';
