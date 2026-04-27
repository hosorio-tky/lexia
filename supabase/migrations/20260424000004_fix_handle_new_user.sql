-- ============================================================
-- LEXIA — MIGRACIÓN 004: Fix handle_new_user trigger
--
-- Problema: GoTrue aplica app_metadata en un UPDATE posterior
-- al INSERT inicial en auth.users. El trigger disparaba en el
-- INSERT con raw_app_meta_data vacío → tenant_id NULL →
-- violación NOT NULL → "Database error creating new user".
--
-- Solución: si tenant_id no está disponible aún, el trigger
-- omite la inserción del profile (se hace manualmente desde
-- la Server Action con los datos correctos).
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id uuid;
  v_rol       text;
  v_nombre    text;
BEGIN
  v_tenant_id := (NEW.raw_app_meta_data ->> 'tenant_id')::uuid;
  v_rol       := COALESCE(NEW.raw_app_meta_data ->> 'rol', 'usuario');
  v_nombre    := COALESCE(NEW.raw_user_meta_data ->> 'nombre', split_part(NEW.email, '@', 1));

  -- Si no hay tenant_id en app_metadata todavía, no insertar el profile.
  -- La Server Action lo insertará manualmente después con los datos correctos.
  IF v_tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO profiles (id, tenant_id, nombre, email, rol)
  VALUES (NEW.id, v_tenant_id, v_nombre, NEW.email, v_rol)
  ON CONFLICT (id) DO NOTHING;  -- idempotente: si ya existe, no fallar

  RETURN NEW;
END;
$$;
