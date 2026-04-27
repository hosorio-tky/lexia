-- ============================================================
-- LEXIA — SEED DATA (desarrollo / demo)
-- Tenant demo + usuario admin + catálogos + permisos de prueba
-- NUNCA incluir en producción
-- ============================================================

-- ─── 1. TENANT DEMO ──────────────────────────────────────────
INSERT INTO tenants (id, nombre, slug, activo, descripcion, industria, pais, color_marca) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Empresa Demo',
    'demo',
    true,
    'Empresa de demostración para Lexia',
    'Alimentos y Bebidas',
    'El Salvador',
    '#6366f1'
  )
ON CONFLICT (id) DO UPDATE SET
  descripcion  = EXCLUDED.descripcion,
  industria    = EXCLUDED.industria,
  pais         = EXCLUDED.pais,
  color_marca  = EXCLUDED.color_marca;

-- ─── 2. USUARIO DEMO ─────────────────────────────────────────
-- Credenciales: admin@lexia.dev / Admin1234!
-- Disponible siempre después de un db reset. Solo para desarrollo.
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, role, aud
) VALUES (
  '00000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000000',
  'admin@lexia.dev',
  crypt('Admin1234!', gen_salt('bf')),
  now(),
  '{"tenant_id":"00000000-0000-0000-0000-000000000001","rol":"admin"}',
  '{"nombre":"Admin Demo"}',
  now(), now(), 'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Profile del usuario demo (el trigger lo saltará porque tenant_id
-- no está disponible en el INSERT de auth.users; lo insertamos manualmente)
INSERT INTO profiles (id, tenant_id, nombre, email, rol, activo) VALUES
  (
    '00000000-0000-0000-0000-000000000099',
    '00000000-0000-0000-0000-000000000001',
    'Admin Demo',
    'admin@lexia.dev',
    'admin',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ─── 3. CATÁLOGOS: tipos de permiso ──────────────────────────
INSERT INTO catalogos (tenant_id, modulo, tipo, valor, etiqueta, orden) VALUES
  ('00000000-0000-0000-0000-000000000001', 'permisos', 'tipo_permiso', 'Ambiental',    'Ambiental',    1),
  ('00000000-0000-0000-0000-000000000001', 'permisos', 'tipo_permiso', 'Sanitario',    'Sanitario',    2),
  ('00000000-0000-0000-0000-000000000001', 'permisos', 'tipo_permiso', 'Operativo',    'Operativo',    3),
  ('00000000-0000-0000-0000-000000000001', 'permisos', 'tipo_permiso', 'Construcción', 'Construcción', 4),
  ('00000000-0000-0000-0000-000000000001', 'permisos', 'tipo_permiso', 'Importación',  'Importación',  5),
  ('00000000-0000-0000-0000-000000000001', 'permisos', 'tipo_permiso', 'Laboral',      'Laboral',      6),
  ('00000000-0000-0000-0000-000000000001', 'permisos', 'tipo_permiso', 'Tributario',   'Tributario',   7)
ON CONFLICT DO NOTHING;

-- ─── 4. CATÁLOGOS: entidades reguladoras ─────────────────────
INSERT INTO catalogos (tenant_id, modulo, tipo, valor, etiqueta, orden) VALUES
  ('00000000-0000-0000-0000-000000000001', 'permisos', 'entidad_reguladora', 'MARN',               'MARN',               1),
  ('00000000-0000-0000-0000-000000000001', 'permisos', 'entidad_reguladora', 'MINSAL',             'MINSAL',             2),
  ('00000000-0000-0000-0000-000000000001', 'permisos', 'entidad_reguladora', 'Alcaldía Municipal', 'Alcaldía Municipal', 3),
  ('00000000-0000-0000-0000-000000000001', 'permisos', 'entidad_reguladora', 'MTPS',               'MTPS',               4),
  ('00000000-0000-0000-0000-000000000001', 'permisos', 'entidad_reguladora', 'MINEC',              'MINEC',              5),
  ('00000000-0000-0000-0000-000000000001', 'permisos', 'entidad_reguladora', 'CNR',                'CNR',                6),
  ('00000000-0000-0000-0000-000000000001', 'permisos', 'entidad_reguladora', 'SSF',                'SSF',                7)
ON CONFLICT DO NOTHING;

-- ─── 5. PLANTILLAS DE ALERTA ─────────────────────────────────
INSERT INTO plantillas_alerta (tenant_id, nombre, modulo, evento, dias_antes, canal) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Aviso 90 días antes de vencimiento', 'permisos', 'vencimiento_proximo', 90, 'in_app'),
  ('00000000-0000-0000-0000-000000000001', 'Aviso 30 días antes de vencimiento', 'permisos', 'vencimiento_proximo', 30, 'in_app'),
  ('00000000-0000-0000-0000-000000000001', 'Aviso 7 días antes de vencimiento',  'permisos', 'vencimiento_proximo',  7, 'in_app')
ON CONFLICT DO NOTHING;

-- ─── 6. PERMISOS DEMO ────────────────────────────────────────
INSERT INTO permisos (
  tenant_id, numero_expediente, nombre,
  tipo, entidad_reguladora, ubicacion,
  estado, fecha_solicitud, fecha_emision, fecha_vencimiento, responsable_nombre
) VALUES
  ('00000000-0000-0000-0000-000000000001', 'MINSAL-RS-2026-0142',   'Registro Sanitario — Bebida carbonatada',            'Sanitario',    'MINSAL',             'San Salvador', 'Pre-Renovación', '2023-03-01', '2023-03-10', '2026-06-10', 'Ana López'),
  ('00000000-0000-0000-0000-000000000001', 'MARN-AA-2025-0902',     'Autorización Ambiental — Planta de bebidas',         'Ambiental',    'MARN',               'San Salvador', 'Vigente',        '2025-05-01', '2025-07-14', '2026-07-14', 'Juan Pérez'),
  ('00000000-0000-0000-0000-000000000001', 'MARN-RES-2026-0031',    'Permiso de manejo de residuos',                      'Ambiental',    'MARN',               'Soyapango',    'En Revisión',    '2026-01-15', null,         '2027-04-03', 'María Ortega'),
  ('00000000-0000-0000-0000-000000000001', 'ALCALDIA-OP-2026-0234', 'Permiso Municipal de Operación',                     'Operativo',    'Alcaldía Municipal', 'Santa Tecla',  'Vigente',        '2025-12-01', '2026-01-15', '2027-01-15', 'Sofía Núñez'),
  ('00000000-0000-0000-0000-000000000001', 'MARN-FORM-2026-0089',   'Formulario Ambiental — Producción agua embotellada', 'Ambiental',    'MARN',               'Soyapango',    'Pre-Renovación', '2023-01-10', '2023-02-01', '2026-05-30', 'Diego Ramos'),
  ('00000000-0000-0000-0000-000000000001', 'DEFENSA-CIVIL-2026-045','Permiso de funcionamiento Protección Civil',          'Operativo',    'Alcaldía Municipal', 'Santa Tecla',  'En Trámite',     '2026-02-01', null,         '2027-05-20', 'Carlos Mejía'),
  ('00000000-0000-0000-0000-000000000001', 'DIGESTYC-INS-2026-0156','Inscripción Industrial',                              'Operativo',    'MINEC',              'San Salvador', 'Vigente',        '2025-10-01', '2025-11-15', '2026-11-15', 'Lucía Herrera'),
  ('00000000-0000-0000-0000-000000000001', 'MINSAL-RS-2026-0089',   'Registro Sanitario — Bebida energética',             'Sanitario',    'MINSAL',             'San Salvador', 'Requisitos',     '2026-02-15', null,         '2027-06-10', 'Paola Castillo')
ON CONFLICT DO NOTHING;
