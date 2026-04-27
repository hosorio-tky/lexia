-- ============================================================
-- LEXIA — MIGRACIÓN 006: MÓDULO TAREAS (T02)
--
-- F01 — Vista Kanban (estados: pendiente, en_progreso, completada, cancelada)
-- F04 — Tarjetas enriquecidas (prioridad, fecha, asignado, módulo origen)
-- F09 — Detalle tarea con comentarios
-- F10 — Crear desde cualquier módulo (modulo_origen + recurso_id)
-- F11 — Notificaciones via user_activity_log
-- ============================================================

-- ─── Tabla principal: tareas ──────────────────────────────────
CREATE TABLE tareas (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  titulo            TEXT        NOT NULL,
  descripcion       TEXT,
  estado            TEXT        NOT NULL DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente', 'en_progreso', 'completada', 'cancelada')),
  prioridad         TEXT        NOT NULL DEFAULT 'media'
                      CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
  asignado_a        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  asignado_nombre   TEXT,
  modulo_origen     TEXT,           -- 'permisos' | 'contratos' | null (tarea suelta)
  recurso_id        UUID,           -- ID del registro relacionado
  recurso_desc      TEXT,           -- Nombre del registro relacionado (desnormalizado)
  fecha_limite      DATE,
  orden             INT         NOT NULL DEFAULT 0,
  created_by        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_nombre TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tareas_select_tenant" ON tareas
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY "tareas_insert_tenant" ON tareas
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY "tareas_update_tenant" ON tareas
  FOR UPDATE USING (tenant_id = current_tenant_id());
CREATE POLICY "tareas_delete_tenant" ON tareas
  FOR DELETE USING (tenant_id = current_tenant_id());
CREATE POLICY "tareas_admin_all" ON tareas
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_tareas_tenant_estado    ON tareas (tenant_id, estado);
CREATE INDEX idx_tareas_tenant_asignado  ON tareas (tenant_id, asignado_a);
CREATE INDEX idx_tareas_modulo_recurso   ON tareas (tenant_id, modulo_origen, recurso_id)
  WHERE modulo_origen IS NOT NULL;
CREATE INDEX idx_tareas_fecha_limite     ON tareas (tenant_id, fecha_limite)
  WHERE fecha_limite IS NOT NULL AND estado NOT IN ('completada', 'cancelada');

CREATE TRIGGER set_tareas_updated_at
  BEFORE UPDATE ON tareas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Comentarios de tareas ────────────────────────────────────
CREATE TABLE tarea_comentarios (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tarea_id    UUID        NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  user_nombre TEXT,
  contenido   TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tarea_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tarea_comentarios_select_tenant" ON tarea_comentarios
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY "tarea_comentarios_insert_tenant" ON tarea_comentarios
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY "tarea_comentarios_delete_tenant" ON tarea_comentarios
  FOR DELETE USING (tenant_id = current_tenant_id());
CREATE POLICY "tarea_comentarios_admin_all" ON tarea_comentarios
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_tarea_comentarios_tarea ON tarea_comentarios (tarea_id, created_at);
