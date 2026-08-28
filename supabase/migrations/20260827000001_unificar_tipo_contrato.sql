-- ============================================================
-- Unifica catalogos.tipo para el módulo "contratos".
--
-- Existían dos valores paralelos para el mismo concepto ("tipo de
-- contrato"): 'tipo' (usado por crear/editar/listar/importar
-- contratos) y 'tipo_contrato' (usado por Configuración → Catálogos
-- y por Plantillas de contrato). Esto hacía que los tipos creados
-- desde Configuración no aparecieran al crear un contrato, y viceversa.
--
-- Se estandariza en 'tipo_contrato' (igual convención que 'tipo_permiso'
-- en Permisos) relabeleando las filas existentes en su lugar — no se
-- borran ni recrean, así que contratos.tipo_id (FK) no se ve afectado.
--
-- Verificado antes de escribir esta migración: no hay colisión de
-- `valor` entre ambos buckets para ningún tenant existente, pero el
-- UPDATE igual usa NOT EXISTS por seguridad ante datos futuros.
-- ============================================================

UPDATE catalogos c
SET tipo = 'tipo_contrato'
WHERE c.modulo = 'contratos'
  AND c.tipo = 'tipo'
  AND NOT EXISTS (
    SELECT 1 FROM catalogos c2
    WHERE c2.tenant_id = c.tenant_id
      AND c2.modulo    = 'contratos'
      AND c2.tipo      = 'tipo_contrato'
      AND c2.valor     = c.valor
  );
