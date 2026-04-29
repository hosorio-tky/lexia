-- ============================================================
-- Fix críticos de seguridad
-- 1. RLS Storage: filtrar por tenant_id en el path del objeto
-- 2. Policy de Tareas: eliminar bypass USING (true)
-- ============================================================

-- ── 1. Storage RLS cross-tenant fix ─────────────────────────
-- El path de cada archivo tiene la forma:
--   {tenant_id}/{filename}          (documentos de permisos)
--   lexbase/{tenant_id}/{filename}  (documentos Lexbase)
-- Ambos patrones tienen el tenant_id en la primera o segunda carpeta.

DROP POLICY IF EXISTS "storage_tenant_read"   ON storage.objects;
DROP POLICY IF EXISTS "storage_tenant_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_tenant_delete" ON storage.objects;

-- READ: el primer segmento del path debe ser el tenant_id del usuario,
-- o el segundo segmento si la primera carpeta es "lexbase".
CREATE POLICY "storage_tenant_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documentos'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1] = current_tenant_id()::text
      OR (
        (storage.foldername(name))[1] = 'lexbase'
        AND (storage.foldername(name))[2] = current_tenant_id()::text
      )
    )
  );

-- INSERT: mismo filtro
CREATE POLICY "storage_tenant_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documentos'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1] = current_tenant_id()::text
      OR (
        (storage.foldername(name))[1] = 'lexbase'
        AND (storage.foldername(name))[2] = current_tenant_id()::text
      )
    )
  );

-- DELETE: mismo filtro
CREATE POLICY "storage_tenant_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documentos'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1] = current_tenant_id()::text
      OR (
        (storage.foldername(name))[1] = 'lexbase'
        AND (storage.foldername(name))[2] = current_tenant_id()::text
      )
    )
  );

-- Nota: el service_role (createAdminClient) bypasea RLS por diseño,
-- lo que es correcto para operaciones server-side como proxy de archivos.

-- ── 2. Tareas: eliminar policy bypass USING (true) ───────────
-- La policy "tareas_admin_all" permite a service_role ver/modificar
-- tareas de cualquier tenant. La eliminamos — las 4 policies
-- específicas por operación ya cubren todos los casos correctamente.

DROP POLICY IF EXISTS "tareas_admin_all" ON tareas;

-- Las policies que quedan son suficientes:
-- tareas_select_tenant: SELECT WHERE tenant_id = current_tenant_id()
-- tareas_insert_tenant: INSERT CHECK tenant_id = current_tenant_id()
-- tareas_update_tenant: UPDATE WHERE tenant_id = current_tenant_id()
-- tareas_delete_tenant: DELETE WHERE tenant_id = current_tenant_id()
