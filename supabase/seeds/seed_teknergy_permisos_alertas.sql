-- ============================================================
-- LEXIA — SEED: Permisos Teknergy para pruebas de alertas
-- Tenant: Teknergy (c2eb9fe2-2cb9-4916-b154-f971b7f6f136)
-- Contexto: El Salvador — datos realistas
-- Semáforos cubiertos: vencido x2, crítico x2, advertencia x2,
--                      próximo x2, vigente x2
-- ============================================================

-- ─── 1. CATÁLOGOS ADICIONALES ────────────────────────────────
-- tipos de permiso
INSERT INTO catalogos (id, tenant_id, modulo, tipo, valor, etiqueta, activo) VALUES
  ('cc100001-0000-0000-0000-000000000001', 'c2eb9fe2-2cb9-4916-b154-f971b7f6f136', 'permisos', 'tipo_permiso', 'Sanitario',   'Sanitario',   true),
  ('cc100001-0000-0000-0000-000000000002', 'c2eb9fe2-2cb9-4916-b154-f971b7f6f136', 'permisos', 'tipo_permiso', 'Operativo',   'Operativo',   true),
  ('cc100001-0000-0000-0000-000000000003', 'c2eb9fe2-2cb9-4916-b154-f971b7f6f136', 'permisos', 'tipo_permiso', 'Importación', 'Importación', true),
  ('cc100001-0000-0000-0000-000000000004', 'c2eb9fe2-2cb9-4916-b154-f971b7f6f136', 'permisos', 'tipo_permiso', 'Tributario',  'Tributario',  true),
  ('cc100001-0000-0000-0000-000000000005', 'c2eb9fe2-2cb9-4916-b154-f971b7f6f136', 'permisos', 'tipo_permiso', 'Laboral',     'Laboral',     true)
ON CONFLICT (id) DO NOTHING;

-- entidades reguladoras
INSERT INTO catalogos (id, tenant_id, modulo, tipo, valor, etiqueta, activo) VALUES
  ('cc200001-0000-0000-0000-000000000001', 'c2eb9fe2-2cb9-4916-b154-f971b7f6f136', 'permisos', 'entidad_reguladora', 'MINSAL',                         'MINSAL',                         true),
  ('cc200001-0000-0000-0000-000000000002', 'c2eb9fe2-2cb9-4916-b154-f971b7f6f136', 'permisos', 'entidad_reguladora', 'Alcaldía Municipal San Salvador', 'Alcaldía Municipal San Salvador', true),
  ('cc200001-0000-0000-0000-000000000003', 'c2eb9fe2-2cb9-4916-b154-f971b7f6f136', 'permisos', 'entidad_reguladora', 'Ministerio de Hacienda',          'Ministerio de Hacienda',          true),
  ('cc200001-0000-0000-0000-000000000004', 'c2eb9fe2-2cb9-4916-b154-f971b7f6f136', 'permisos', 'entidad_reguladora', 'CNR',                            'CNR',                            true),
  ('cc200001-0000-0000-0000-000000000005', 'c2eb9fe2-2cb9-4916-b154-f971b7f6f136', 'permisos', 'entidad_reguladora', 'MINTRAB',                        'MINTRAB',                        true)
ON CONFLICT (id) DO NOTHING;

-- ─── 2. PERMISOS ─────────────────────────────────────────────
-- Semáforo calculado por v_permisos (fecha_vencimiento vs CURRENT_DATE):
--   vencido    < hoy
--   crítico    <= hoy + 15
--   advertencia<= hoy + 30
--   próximo    <= hoy + 90
--   vigente    >  hoy + 90

INSERT INTO permisos (
  tenant_id, numero_expediente, nombre, descripcion,
  tipo_id, entidad_reguladora_id, ubicacion_id,
  estado, fecha_solicitud, fecha_emision, fecha_vencimiento,
  responsable_id, responsable_nombre,
  base_legal, riesgo_incumplimiento
) VALUES

-- ── VENCIDO 1 ─ venció hace 2+ meses ──────────────────────────
(
  'c2eb9fe2-2cb9-4916-b154-f971b7f6f136',
  'MARN-PA-2024-00201',
  'Permiso Ambiental — Centro de Distribución Merliot',
  'Autorización ambiental para operación del centro de distribución CD Merliot. Incluye manejo de residuos sólidos, emisiones de flota vehicular y vertido de aguas residuales. Venció sin renovar.',
  'c7446ee6-6873-4d1b-9bd7-17db8cc0ad93',  -- Ambiental
  'd8610553-542d-425b-99b0-42b782348f86',  -- MARN
  '6dac10ad-67dc-4866-9f9c-340cd2c7e55e',  -- CD Merliot
  'Activo',
  '2022-04-01', '2022-06-15', (CURRENT_DATE - INTERVAL '75 days')::date,
  '3c39ee53-f3e1-412c-88f1-066b25914887', 'Edgardo Barahona',
  'Art. 21 Ley de Medio Ambiente (D.L. No. 233); Reglamento General LMA (D.E. No. 17, Art. 16-30).',
  'Paralización inmediata de operaciones por orden del MARN. Multa de hasta $11,428 por día de operación sin autorización. Responsabilidad penal para el representante legal.'
),

-- ── VENCIDO 2 ─ venció hace ~3 semanas ────────────────────────
(
  'c2eb9fe2-2cb9-4916-b154-f971b7f6f136',
  'MINSAL-LF-2024-00892',
  'Licencia de Funcionamiento Sanitaria — Bodega Soyapango',
  'Licencia sanitaria de funcionamiento para almacenamiento y distribución de alimentos empacados (snacks, bebidas) en instalaciones de CD Soyapango. Área: 1,800 m². Venció sin tramitar renovación.',
  'cc100001-0000-0000-0000-000000000001', -- Sanitario
  'cc200001-0000-0000-0000-000000000001', -- MINSAL
  '0c5853d7-cc11-4f93-b985-b4f365c7cc34', -- CD Soyapango
  'Activo',
  '2022-09-01', '2022-11-10', (CURRENT_DATE - INTERVAL '22 days')::date,
  'e95c50b9-d55d-4e3e-9cc5-0985cad62b20', 'Roberto Castillo Ext',
  'Art. 86 Código de Salud (D.L. No. 955); Reglamento BPM (D.E. No. 67).',
  'Clausura temporal por orden del MINSAL. Multa entre $1,000 y $50,000. Decomiso de productos almacenados.'
),

-- ── CRÍTICO 1 ─ vence en 5 días ───────────────────────────────
(
  'c2eb9fe2-2cb9-4916-b154-f971b7f6f136',
  'ALCALDIA-SS-2024-01103',
  'Permiso Municipal de Operación — CD San Mateo',
  'Autorización municipal para operación de bodega de almacenamiento y distribución en CD San Mateo, Blvd. Los Héroes. Área: 3,200 m². Vencimiento inminente, renovación en trámite.',
  'cc100001-0000-0000-0000-000000000002', -- Operativo
  'cc200001-0000-0000-0000-000000000002', -- Alcaldía Municipal SS
  'a75a4e46-61fe-473d-8821-3870931b2e3b', -- CD San Mateo
  'Activo',
  '2024-08-01', '2024-08-20', (CURRENT_DATE + INTERVAL '5 days')::date,
  '3c39ee53-f3e1-412c-88f1-066b25914887', 'Edgardo Barahona',
  'Ordenanza Reguladora Actividad Comercial San Salvador; Ley General Tributaria Municipal (D.L. No. 86, Art. 3).',
  'Cierre temporal por orden municipal. Multa de hasta $2,000. Impacto en operaciones de distribución de la zona norte.'
),

-- ── CRÍTICO 2 ─ vence en 11 días ──────────────────────────────
(
  'c2eb9fe2-2cb9-4916-b154-f971b7f6f136',
  'MINSAL-RS-2024-00384',
  'Registro Sanitario — Bebidas de Frutas Tropicales (Línea Frut-T)',
  'Registro sanitario para distribución de bebidas no carbonatadas a base de frutas tropicales. Variedades mango, maracuyá y piña. Emitido 2024, renovación urgente requerida.',
  'cc100001-0000-0000-0000-000000000001', -- Sanitario
  'cc200001-0000-0000-0000-000000000001', -- MINSAL
  '6dac10ad-67dc-4866-9f9c-340cd2c7e55e', -- CD Merliot
  'Activo',
  '2024-07-15', '2024-08-01', (CURRENT_DATE + INTERVAL '11 days')::date,
  '7830fd50-fcdd-4e14-9f1b-498ec0c11a1c', 'Hernaneo Outlook',
  'Art. 86 Código de Salud (D.L. No. 955); Reglamento Alimentos (D.E. No. 59); RTCA 67.01.60:10.',
  'Suspensión inmediata de comercialización. Decomiso de inventario. Multa entre $500 y $11,428.'
),

-- ── ADVERTENCIA 1 ─ vence en 20 días ─────────────────────────
(
  'c2eb9fe2-2cb9-4916-b154-f971b7f6f136',
  'MH-DISTRIB-2024-00519',
  'Licencia Distribución Bebidas con Contenido Alcohólico',
  'Licencia del Ministerio de Hacienda para distribución mayorista de cervezas, vinos y licores importados. Sujeta al pago del Impuesto sobre Bebidas Alcohólicas. Aplica a nivel nacional.',
  'cc100001-0000-0000-0000-000000000004', -- Tributario
  'cc200001-0000-0000-0000-000000000003', -- Ministerio de Hacienda
  '6dac10ad-67dc-4866-9f9c-340cd2c7e55e', -- CD Merliot
  'Activo',
  '2024-08-01', '2024-08-20', (CURRENT_DATE + INTERVAL '20 days')::date,
  'e95c50b9-d55d-4e3e-9cc5-0985cad62b20', 'Roberto Castillo Ext',
  'Ley Reguladora Producción y Comercialización del Alcohol (D.L. No. 439), Art. 3 y 12; Código Tributario, Art. 162.',
  'Decomiso de inventario de bebidas alcohólicas. Multa de hasta $57,142. Cancelación de licencia sin renovación por 5 años.'
),

-- ── ADVERTENCIA 2 ─ vence en 27 días ─────────────────────────
(
  'c2eb9fe2-2cb9-4916-b154-f971b7f6f136',
  'MINEC-IMP-2024-00744',
  'Permiso de Importación — Bebidas Carbonatadas y Energéticas',
  'Autorización de importación para bebidas carbonatadas y energéticas provenientes de Guatemala y Honduras bajo exclusividad regional. Requiere cumplimiento RTCA 67.04.54:10.',
  'cc100001-0000-0000-0000-000000000003', -- Importación
  'cc200001-0000-0000-0000-000000000003', -- Ministerio de Hacienda
  'a75a4e46-61fe-473d-8821-3870931b2e3b', -- CD San Mateo
  'Activo',
  '2024-08-05', '2024-08-25', (CURRENT_DATE + INTERVAL '27 days')::date,
  '7830fd50-fcdd-4e14-9f1b-498ec0c11a1c', 'Hernaneo Outlook',
  'RTCA 67.04.54:10 (Bebidas Carbonatadas); Ley de Simplificación Aduanera (D.L. No. 529); SAC Cap. 22.',
  'Retención en puertos de entrada. Multa aduanera hasta el 100% del valor CIF. Pérdida de exclusividad de distribución.'
),

-- ── PRÓXIMO 1 ─ vence en 47 días ─────────────────────────────
(
  'c2eb9fe2-2cb9-4916-b154-f971b7f6f136',
  'MINTRAB-2025-00218',
  'Reglamento Interno de Trabajo — Aprobación MINTRAB',
  'Aprobación del Reglamento Interno de Trabajo por parte del Ministerio de Trabajo. Cubre normas de asistencia, disciplina, higiene y seguridad ocupacional para los 120 empleados en las tres bodegas.',
  'cc100001-0000-0000-0000-000000000005', -- Laboral
  'cc200001-0000-0000-0000-000000000005', -- MINTRAB
  '0c5853d7-cc11-4f93-b985-b4f365c7cc34', -- CD Soyapango
  'Activo',
  '2025-09-01', '2025-10-01', (CURRENT_DATE + INTERVAL '47 days')::date,
  '3c39ee53-f3e1-412c-88f1-066b25914887', 'Edgardo Barahona',
  'Art. 302 Código de Trabajo: empleadores con 10+ trabajadores deben tener reglamento aprobado por MINTRAB. D.E. No. 86 (Reglamento General de Prevención de Riesgos en los Lugares de Trabajo).',
  'Multa de $57 a $5,714 por operar sin reglamento vigente. Inspectoría del MINTRAB puede paralizar operaciones si detecta ausencia de reglamento en visita.'
),

-- ── PRÓXIMO 2 ─ vence en 72 días ─────────────────────────────
(
  'c2eb9fe2-2cb9-4916-b154-f971b7f6f136',
  'MARN-PA-2025-00612',
  'Permiso Ambiental — Centro de Distribución Soyapango',
  'Autorización ambiental para operación del CD Soyapango. Incluye plan de manejo de residuos, monitoreo de emisiones de flota y control de aguas residuales. Sujeto a seguimiento semestral del MARN.',
  'c7446ee6-6873-4d1b-9bd7-17db8cc0ad93',  -- Ambiental
  'd8610553-542d-425b-99b0-42b782348f86',  -- MARN
  '0c5853d7-cc11-4f93-b985-b4f365c7cc34', -- CD Soyapango
  'Activo',
  '2025-08-15', '2025-10-01', (CURRENT_DATE + INTERVAL '72 days')::date,
  'e95c50b9-d55d-4e3e-9cc5-0985cad62b20', 'Roberto Castillo Ext',
  'Art. 21 Ley de Medio Ambiente (D.L. No. 233); Reglamento General LMA (D.E. No. 17). Sistema de Gestión Ambiental Empresarial (SGAE) del MARN.',
  'Paralización de operaciones por el MARN. Multa de $1,142 a $11,428 por día. Responsabilidad penal para representante legal.'
),

-- ── VIGENTE 1 ─ vence en ~6 meses ─────────────────────────────
(
  'c2eb9fe2-2cb9-4916-b154-f971b7f6f136',
  'CNR-MARCA-2025-00041',
  'Registro de Marca Comercial — "SNACKPLUS El Salvador"',
  'Registro de marca en Clase 30 (snacks, galletas, cereales) y Clase 32 (bebidas no alcohólicas, jugos). Emitido por CNR bajo Ley de Marcas y Otros Signos Distintivos. Renovable cada 10 años.',
  'cc100001-0000-0000-0000-000000000002', -- Operativo
  'cc200001-0000-0000-0000-000000000004', -- CNR
  '6dac10ad-67dc-4866-9f9c-340cd2c7e55e', -- CD Merliot
  'Activo',
  '2025-01-20', '2025-02-15', (CURRENT_DATE + INTERVAL '180 days')::date,
  '7830fd50-fcdd-4e14-9f1b-498ec0c11a1c', 'Hernaneo Outlook',
  'Ley de Marcas y Otros Signos Distintivos (D.L. No. 868), Art. 5 y 8; Convenio de París; Acuerdo ADPIC (OMC).',
  'Terceros podrían registrar la misma marca. Pérdida de identidad comercial. Imposibilidad de demandar por infracción de marca a competidores.'
),

-- ── VIGENTE 2 ─ vence en ~2 años ──────────────────────────────
(
  'c2eb9fe2-2cb9-4916-b154-f971b7f6f136',
  'ALCALDIA-SS-2026-00071',
  'Permiso Municipal de Operación — CD Merliot',
  'Autorización municipal para operación de bodega en CD Merliot, Antiguo Cuscatlán, La Libertad. Área: 4,500 m². Permiso recién renovado por 2 años tras inspección satisfactoria.',
  'cc100001-0000-0000-0000-000000000002', -- Operativo
  'cc200001-0000-0000-0000-000000000002', -- Alcaldía Municipal SS
  '6dac10ad-67dc-4866-9f9c-340cd2c7e55e', -- CD Merliot
  'Activo',
  '2026-06-01', '2026-07-15', (CURRENT_DATE + INTERVAL '730 days')::date,
  '3c39ee53-f3e1-412c-88f1-066b25914887', 'Edgardo Barahona',
  'Ordenanza Reguladora Actividad Comercial Antiguo Cuscatlán; Ley General Tributaria Municipal (D.L. No. 86); Ley de Urbanismo y Construcción.',
  'Cierre temporal por orden municipal. Multa de hasta $2,000. Afectación directa a operaciones del CD más grande de la red.'
)

ON CONFLICT DO NOTHING;
