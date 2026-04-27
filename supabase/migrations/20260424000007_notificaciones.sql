-- ============================================================
-- T03 — ALERTAS Y NOTIFICACIONES
-- Tabla notificaciones + función de generación automática
-- ============================================================

-- ─── 1. TABLA notificaciones ──────────────────────────────────
CREATE TABLE IF NOT EXISTS notificaciones (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  titulo        TEXT        NOT NULL,
  mensaje       TEXT,
  tipo          TEXT        NOT NULL DEFAULT 'in_app' CHECK (tipo IN ('in_app', 'email')),
  modulo        TEXT,                       -- 'permisos', 'tareas', ...
  recurso_id    TEXT,                       -- UUID del recurso como texto
  recurso_desc  TEXT,                       -- descripción legible
  leida         BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_notif_user_id    ON notificaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_tenant_id  ON notificaciones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notif_leida      ON notificaciones(user_id, leida) WHERE NOT leida;
CREATE INDEX IF NOT EXISTS idx_notif_created    ON notificaciones(created_at DESC);

-- ─── 2. RLS ────────────────────────────────────────────────────
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo ve sus propias notificaciones
CREATE POLICY "users_see_own_notifications" ON notificaciones
  FOR SELECT USING (user_id = auth.uid());

-- Solo el sistema (SECURITY DEFINER) puede insertar
CREATE POLICY "service_insert_notifications" ON notificaciones
  FOR INSERT WITH CHECK (true);

-- El usuario puede marcar como leída o eliminar las suyas
CREATE POLICY "users_update_own_notifications" ON notificaciones
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "users_delete_own_notifications" ON notificaciones
  FOR DELETE USING (user_id = auth.uid());

-- ─── 3. FUNCIÓN: generar_alertas_vencimiento() ────────────────
-- Revisa permisos que vencen en exactamente N días (según plantillas_alerta)
-- y crea notificaciones para los usuarios del tenant que aún no la tienen hoy.
-- Llamar diariamente desde un cron job o manualmente.

CREATE OR REPLACE FUNCTION generar_alertas_vencimiento(p_tenant_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plantilla   RECORD;
  v_permiso     RECORD;
  v_user        RECORD;
  v_count       INTEGER := 0;
BEGIN
  FOR v_plantilla IN
    SELECT *
    FROM   plantillas_alerta
    WHERE  activo     = true
      AND  evento     = 'vencimiento_proximo'
      AND  canal      = 'in_app'
      AND  dias_antes IS NOT NULL
      AND  (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
  LOOP
    -- Captura todos los permisos que vencen dentro de los próximos N días
    FOR v_permiso IN
      SELECT id, nombre, fecha_vencimiento, tenant_id
      FROM   permisos
      WHERE  tenant_id = v_plantilla.tenant_id
        AND  fecha_vencimiento::DATE
               BETWEEN CURRENT_DATE
               AND     CURRENT_DATE + (v_plantilla.dias_antes || ' days')::INTERVAL
        AND  estado != 'Vencido'
    LOOP
      FOR v_user IN
        SELECT id
        FROM   profiles
        WHERE  tenant_id = v_plantilla.tenant_id
          AND  activo    = true
          AND  rol       IN ('admin', 'supervisor', 'abogado')
      LOOP
        -- Evitar duplicados: máximo 1 notif por (user, permiso) por día
        IF NOT EXISTS (
          SELECT 1
          FROM   notificaciones
          WHERE  user_id     = v_user.id
            AND  recurso_id  = v_permiso.id::TEXT
            AND  modulo      = 'permisos'
            AND  created_at::DATE = CURRENT_DATE
        ) THEN
          INSERT INTO notificaciones
            (tenant_id, user_id, titulo, mensaje, tipo, modulo, recurso_id, recurso_desc)
          VALUES (
            v_plantilla.tenant_id,
            v_user.id,
            'Vencimiento en ' || (v_permiso.fecha_vencimiento::DATE - CURRENT_DATE) || ' días',
            v_permiso.nombre || ' vence el '
              || TO_CHAR(v_permiso.fecha_vencimiento, 'DD/MM/YYYY'),
            'in_app',
            'permisos',
            v_permiso.id::TEXT,
            v_permiso.nombre
          );
          v_count := v_count + 1;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ─── 4. FUNCIÓN: insertar notif de cambio de estado ───────────
-- Llamar desde Server Actions cuando un permiso cambia de estado.
CREATE OR REPLACE FUNCTION crear_notificacion_sistema(
  p_tenant_id   UUID,
  p_user_id     UUID,
  p_titulo      TEXT,
  p_mensaje     TEXT,
  p_modulo      TEXT DEFAULT NULL,
  p_recurso_id  TEXT DEFAULT NULL,
  p_recurso_desc TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO notificaciones
    (tenant_id, user_id, titulo, mensaje, tipo, modulo, recurso_id, recurso_desc)
  VALUES
    (p_tenant_id, p_user_id, p_titulo, p_mensaje, 'in_app',
     p_modulo, p_recurso_id, p_recurso_desc)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
