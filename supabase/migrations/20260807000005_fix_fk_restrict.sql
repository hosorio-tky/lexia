-- Fix FK constraints: departamento_id and entidad_reguladora_id should be ON DELETE RESTRICT
-- (all catalog references must block deletion if in use)

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_departamento_id_fkey;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_departamento_id_fkey
  FOREIGN KEY (departamento_id) REFERENCES catalogos(id) ON DELETE RESTRICT;

ALTER TABLE permisos
  DROP CONSTRAINT IF EXISTS permisos_entidad_reguladora_id_fkey;
ALTER TABLE permisos
  ADD CONSTRAINT permisos_entidad_reguladora_id_fkey
  FOREIGN KEY (entidad_reguladora_id) REFERENCES catalogos(id) ON DELETE RESTRICT;
