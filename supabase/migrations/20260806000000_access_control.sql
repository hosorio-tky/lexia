-- ============================================================
-- Control de Acceso Fino: Grupos, Miembros y ACL por Recurso
-- ============================================================
-- Reglas de negocio:
--   - visibilidad = 'publico'     → todos en el tenant pueden ver y editar
--   - visibilidad = 'restringido' → solo: admin, created_by, responsable
--                                   (si user_id está vinculado) o acceso explícito via recurso_acceso
--   - recurso_acceso.nivel = 'lectura'  → puede ver, no editar
--   - recurso_acceso.nivel = 'edicion'  → puede ver y editar
--   - Quién puede cambiar accesos: admin o el created_by del recurso
-- ============================================================

-- ─── 1. Vincular responsables a usuarios del sistema (opcional) ─
ALTER TABLE responsables
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_responsables_user
  ON responsables(user_id) WHERE user_id IS NOT NULL;

-- ─── 2. Columna visibilidad en permisos y contratos ──────────
ALTER TABLE permisos
  ADD COLUMN visibilidad text NOT NULL DEFAULT 'publico'
  CHECK (visibilidad IN ('publico', 'restringido'));

ALTER TABLE contratos
  ADD COLUMN visibilidad text NOT NULL DEFAULT 'publico'
  CHECK (visibilidad IN ('publico', 'restringido'));

-- ─── 3. Tabla grupos ──────────────────────────────────────────
CREATE TABLE grupos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nombre      text        NOT NULL,
  descripcion text,
  color       text        NOT NULL DEFAULT '#64748B',
  created_by  uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_grupos_tenant ON grupos(tenant_id);

ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grupos: select"
  ON grupos FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "grupos: insert"
  ON grupos FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id()
    AND current_user_role() IN ('admin', 'supervisor'));

CREATE POLICY "grupos: update"
  ON grupos FOR UPDATE
  USING (tenant_id = current_tenant_id()
    AND current_user_role() IN ('admin', 'supervisor'));

CREATE POLICY "grupos: delete"
  ON grupos FOR DELETE
  USING (tenant_id = current_tenant_id()
    AND current_user_role() = 'admin');

-- ─── 4. Tabla grupo_miembros ─────────────────────────────────
CREATE TABLE grupo_miembros (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  grupo_id   uuid        NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  added_by   uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grupo_id, user_id)
);

CREATE INDEX idx_grupo_miembros_grupo   ON grupo_miembros(grupo_id);
CREATE INDEX idx_grupo_miembros_user    ON grupo_miembros(user_id);
CREATE INDEX idx_grupo_miembros_tenant  ON grupo_miembros(tenant_id);

ALTER TABLE grupo_miembros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grupo_miembros: select"
  ON grupo_miembros FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "grupo_miembros: insert"
  ON grupo_miembros FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id()
    AND current_user_role() IN ('admin', 'supervisor'));

CREATE POLICY "grupo_miembros: delete"
  ON grupo_miembros FOR DELETE
  USING (tenant_id = current_tenant_id()
    AND current_user_role() IN ('admin', 'supervisor'));

-- ─── 5. Tabla recurso_acceso (sin policy "manage" aún) ───────
CREATE TABLE recurso_acceso (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  resource_type text        NOT NULL CHECK (resource_type IN ('permiso', 'contrato')),
  resource_id   uuid        NOT NULL,
  subject_type  text        NOT NULL CHECK (subject_type IN ('user', 'group')),
  subject_id    uuid        NOT NULL,
  nivel         text        NOT NULL DEFAULT 'lectura' CHECK (nivel IN ('lectura', 'edicion')),
  granted_by    uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resource_type, resource_id, subject_type, subject_id)
);

CREATE INDEX idx_recurso_acceso_resource ON recurso_acceso(resource_type, resource_id);
CREATE INDEX idx_recurso_acceso_subject  ON recurso_acceso(subject_type, subject_id);
CREATE INDEX idx_recurso_acceso_tenant   ON recurso_acceso(tenant_id);

ALTER TABLE recurso_acceso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurso_acceso: select"
  ON recurso_acceso FOR SELECT
  USING (tenant_id = current_tenant_id());

-- ─── 6. Funciones SECURITY DEFINER ───────────────────────────
-- (deben definirse antes de las políticas que las usan)

-- Verifica si el usuario actual creó el recurso dado
CREATE OR REPLACE FUNCTION is_resource_creator(p_resource_type text, p_resource_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE p_resource_type
    WHEN 'permiso'  THEN EXISTS (
      SELECT 1 FROM permisos
      WHERE id = p_resource_id AND created_by = auth.uid() AND tenant_id = current_tenant_id()
    )
    WHEN 'contrato' THEN EXISTS (
      SELECT 1 FROM contratos
      WHERE id = p_resource_id AND created_by = auth.uid() AND tenant_id = current_tenant_id()
    )
    ELSE false
  END
$$;

-- Verifica si el usuario tiene acceso de lectura o superior al recurso
CREATE OR REPLACE FUNCTION can_access_resource(p_resource_type text, p_resource_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM recurso_acceso ra
    WHERE ra.resource_type = p_resource_type
      AND ra.resource_id   = p_resource_id
      AND ra.tenant_id     = current_tenant_id()
      AND (
        (ra.subject_type = 'user'  AND ra.subject_id = auth.uid())
        OR (ra.subject_type = 'group' AND ra.subject_id IN (
          SELECT gm.grupo_id FROM grupo_miembros gm WHERE gm.user_id = auth.uid()
        ))
      )
  )
$$;

-- Verifica si el usuario tiene acceso de edición al recurso
CREATE OR REPLACE FUNCTION can_write_resource(p_resource_type text, p_resource_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM recurso_acceso ra
    WHERE ra.resource_type = p_resource_type
      AND ra.resource_id   = p_resource_id
      AND ra.tenant_id     = current_tenant_id()
      AND ra.nivel         = 'edicion'
      AND (
        (ra.subject_type = 'user'  AND ra.subject_id = auth.uid())
        OR (ra.subject_type = 'group' AND ra.subject_id IN (
          SELECT gm.grupo_id FROM grupo_miembros gm WHERE gm.user_id = auth.uid()
        ))
      )
  )
$$;

-- ─── 7. Policy "manage" para recurso_acceso ──────────────────
-- Ahora que is_resource_creator existe, podemos crearla
CREATE POLICY "recurso_acceso: manage"
  ON recurso_acceso FOR ALL
  USING (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR is_resource_creator(resource_type, resource_id)
    )
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND (
      current_user_role() = 'admin'
      OR is_resource_creator(resource_type, resource_id)
    )
  );

-- ─── 8. Actualizar RLS de permisos ───────────────────────────
DROP POLICY IF EXISTS "permisos: select" ON permisos;
DROP POLICY IF EXISTS "permisos: update" ON permisos;

CREATE POLICY "permisos: select"
  ON permisos FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (
      visibilidad = 'publico'
      OR current_user_role() = 'admin'
      OR created_by = auth.uid()
      OR responsable_id IN (
        SELECT id FROM responsables
        WHERE user_id = auth.uid() AND tenant_id = current_tenant_id()
      )
      OR can_access_resource('permiso', id)
    )
  );

CREATE POLICY "permisos: update"
  ON permisos FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('admin', 'supervisor', 'usuario')
    AND (
      visibilidad = 'publico'
      OR current_user_role() = 'admin'
      OR created_by = auth.uid()
      OR responsable_id IN (
        SELECT id FROM responsables
        WHERE user_id = auth.uid() AND tenant_id = current_tenant_id()
      )
      OR can_write_resource('permiso', id)
    )
  );

-- ─── 9. Actualizar RLS de contratos ─────────────────────────
DO $$
DECLARE pol_name text;
BEGIN
  FOR pol_name IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'contratos' AND cmd IN ('SELECT', 'UPDATE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON contratos', pol_name);
  END LOOP;
END $$;

CREATE POLICY "contratos: select"
  ON contratos FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (
      visibilidad = 'publico'
      OR current_user_role() = 'admin'
      OR created_by = auth.uid()
      OR responsable_id IN (
        SELECT id FROM responsables
        WHERE user_id = auth.uid() AND tenant_id = current_tenant_id()
      )
      OR can_access_resource('contrato', id)
    )
  );

CREATE POLICY "contratos: update"
  ON contratos FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('admin', 'supervisor', 'usuario')
    AND (
      visibilidad = 'publico'
      OR current_user_role() = 'admin'
      OR created_by = auth.uid()
      OR responsable_id IN (
        SELECT id FROM responsables
        WHERE user_id = auth.uid() AND tenant_id = current_tenant_id()
      )
      OR can_write_resource('contrato', id)
    )
  );
