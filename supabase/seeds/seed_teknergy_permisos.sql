-- ============================================================
-- LEXIA — SEED: Permisos Teknergy (Comercializadora de Bebidas y Snacks)
-- Tenant: Teknergy (8edff51b-aeff-4e1c-a083-6f6ed6335c59)
-- Contexto: El Salvador — datos realistas de demo
-- ============================================================

-- ─── 1. RESPONSABLES ─────────────────────────────────────────
-- Responsable existente:
--   Ana María Rodriguez  (Legal)  e1afaec6-637c-40d5-b6df-4a801cf25311

INSERT INTO responsables (id, tenant_id, nombre, area, email, activo) VALUES
  (
    'a1111111-1111-1111-1111-111111111101',
    '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
    'Carlos Ernesto Molina',
    'Operaciones',
    'cmolina@teknergy.com.sv',
    true
  ),
  (
    'a1111111-1111-1111-1111-111111111102',
    '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
    'María José Cisneros',
    'Regulatorio y Cumplimiento',
    'mcisneros@teknergy.com.sv',
    true
  ),
  (
    'a1111111-1111-1111-1111-111111111103',
    '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
    'Roberto Alfredo Gutiérrez',
    'Importaciones y Comercio Exterior',
    'rgutierrez@teknergy.com.sv',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ─── 2. PERMISOS ─────────────────────────────────────────────
-- Estados: Pre-Renovación x2, Vigente x4, En Revisión x1, En Trámite x1, Suspendido x1, Requisitos x1
-- Vencimientos: desde ~30 días hasta ~10 años (variados hacia futuro)

INSERT INTO permisos (
  tenant_id, numero_expediente, nombre, descripcion,
  tipo, entidad_reguladora, ubicacion,
  estado, fecha_solicitud, fecha_emision, fecha_vencimiento,
  responsable_id, responsable_nombre, etiquetas
) VALUES

-- 1. Pre-Renovación · vence en ~1 mes (2026-08-29)
(
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'MINSAL-RS-2024-0318',
  'Registro Sanitario — Bebidas de Frutas Tropicales (Línea Frut-T)',
  'Registro sanitario para la distribución de bebidas no carbonatadas a base de frutas tropicales. Incluye variedades mango, maracuyá y piña. Emitido originalmente en 2024, requiere renovación inmediata.',
  'Sanitario', 'MINSAL', 'San Salvador',
  'Pre-Renovación', '2024-07-15', '2024-08-01', '2026-08-29',
  'e1afaec6-637c-40d5-b6df-4a801cf25311', 'Ana María Rodriguez',
  ARRAY['registro-sanitario', 'bebidas', 'renovacion-urgente']
),

-- 2. Pre-Renovación · vence en ~6 semanas (2026-09-10)
(
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'ALCALDIA-SS-2024-0891',
  'Permiso Municipal de Operación — Bodega Central San Salvador',
  'Autorización municipal para operación de bodega de almacenamiento y distribución de bebidas y snacks. Ubicada en Blvd. del Ejército, km 5, San Salvador. Área: 2,400 m².',
  'Operativo', 'Alcaldía Municipal', 'San Salvador',
  'Pre-Renovación', '2024-08-20', '2024-09-05', '2026-09-10',
  'a1111111-1111-1111-1111-111111111101', 'Carlos Ernesto Molina',
  ARRAY['operacion', 'bodega', 'alcaldia', 'renovacion-urgente']
),

-- 3. Vigente · vence en ~3 meses (2026-10-31)
(
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'MINEC-IMP-2025-0144',
  'Permiso de Importación Definitiva — Bebidas Carbonatadas y Energéticas',
  'Autorización de importación para bebidas carbonatadas y energéticas provenientes de Guatemala y Honduras. Incluye marcas distribuidas bajo acuerdo de exclusividad regional. Requiere cumplimiento del Reglamento Técnico Centroamericano RTCA 67.04.54:10.',
  'Importación', 'MINEC', 'San Salvador',
  'Vigente', '2025-09-01', '2025-10-15', '2026-10-31',
  'a1111111-1111-1111-1111-111111111103', 'Roberto Alfredo Gutiérrez',
  ARRAY['importacion', 'bebidas-carbonatadas', 'RTCA']
),

-- 4. Vigente · vence en ~5 meses (2026-12-20)
(
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'MINSAL-LF-2025-0507',
  'Licencia de Funcionamiento — Planta de Almacenamiento y Distribución',
  'Licencia sanitaria de funcionamiento para instalaciones de almacenamiento, manipulación y distribución de alimentos empacados (snacks, galletas, frituras). Emitida bajo normativa del Código de Salud Art. 86 y Reglamento de Alimentos.',
  'Sanitario', 'MINSAL', 'Soyapango',
  'Vigente', '2025-10-01', '2025-11-20', '2026-12-20',
  'a1111111-1111-1111-1111-111111111102', 'María José Cisneros',
  ARRAY['licencia-funcionamiento', 'alimentos', 'snacks', 'MINSAL']
),

-- 5. En Revisión · vence en ~7 meses (2027-02-28)
(
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'MINSAL-RS-2026-0082',
  'Registro Sanitario — Snacks y Frituras Empacadas (Línea CrunchMax)',
  'Solicitud de registro sanitario para nueva línea de snacks: papas fritas, churritos y palomitas de maíz saborizadas. Actualmente en proceso de revisión de documentación técnica por parte del MINSAL. Análisis microbiológico y fisicoquímico en laboratorio acreditado.',
  'Sanitario', 'MINSAL', 'San Salvador',
  'En Revisión', '2026-01-10', NULL, '2027-02-28',
  'a1111111-1111-1111-1111-111111111102', 'María José Cisneros',
  ARRAY['registro-sanitario', 'snacks', 'en-proceso']
),

-- 6. Vigente · vence en ~11 meses (2027-06-30)
(
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'MARN-AA-2025-0267',
  'Autorización Ambiental de Actividad — Centro de Distribución Soyapango',
  'Autorización ambiental para operación del centro de distribución. Incluye manejo de residuos sólidos, emisiones de gases por flota vehicular y vertido de aguas residuales industriales. Sujeto a seguimiento semestral del MARN y presentación de informe de cumplimiento ambiental.',
  'Ambiental', 'MARN', 'Soyapango',
  'Vigente', '2025-04-15', '2025-06-30', '2027-06-30',
  'a1111111-1111-1111-1111-111111111103', 'Roberto Alfredo Gutiérrez',
  ARRAY['ambiental', 'MARN', 'centro-distribucion']
),

-- 7. En Trámite · vence provisional en ~14 meses (2027-09-15)
(
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'ALCALDIA-SAN-2026-0345',
  'Permiso Municipal de Operación — Punto de Distribución Santa Ana',
  'Trámite de autorización municipal para apertura de nuevo punto de distribución en Santa Ana. Se presentó expediente completo en abril 2026. Pendiente de visita de inspección municipal. Fecha estimada de emisión: Q3 2026.',
  'Operativo', 'Alcaldía Municipal', 'Santa Ana',
  'En Trámite', '2026-04-03', NULL, '2027-09-15',
  'a1111111-1111-1111-1111-111111111101', 'Carlos Ernesto Molina',
  ARRAY['operacion', 'apertura', 'santa-ana']
),

-- 8. Vigente · vence en ~18 meses (2028-01-10)
(
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'MH-DISTRIB-2026-0019',
  'Licencia de Distribución de Bebidas con Contenido Alcohólico',
  'Licencia del Ministerio de Hacienda para distribución mayorista de bebidas alcohólicas (cervezas, vinos y licores importados). Sujeta al pago del Impuesto sobre el Alcohol y Bebidas Alcohólicas (Ley Reguladora de la Producción y Comercialización del Alcohol). Aplica a nivel nacional.',
  'Tributario', 'Ministerio de Hacienda', 'San Salvador',
  'Vigente', '2026-01-05', '2026-01-20', '2028-01-10',
  'a1111111-1111-1111-1111-111111111103', 'Roberto Alfredo Gutiérrez',
  ARRAY['bebidas-alcoholicas', 'licencia-distribucion', 'ministerio-hacienda']
),

-- 9. Suspendido · vence en ~9 meses (2027-04-30)
(
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'MINSAL-MS-2025-0203',
  'Permiso de Manipulación de Alimentos — Personal Operativo (Planta Soyapango)',
  'Permiso de manipulación de alimentos para 45 empleados de planta de almacenamiento. Suspendido temporalmente por MINSAL el 14 de junio 2026 tras inspección que detectó deficiencias en registros de control de temperatura en cámara fría. Requiere capacitación BPM y nueva inspección para reactivación.',
  'Sanitario', 'MINSAL', 'Soyapango',
  'Suspendido', '2025-03-01', '2025-04-10', '2027-04-30',
  'a1111111-1111-1111-1111-111111111102', 'María José Cisneros',
  ARRAY['manipulacion-alimentos', 'BPM', 'suspendido', 'accion-requerida']
),

-- 10. Vigente · vence en ~10 años (marca comercial — 2036-02-15)
(
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'CNR-MARCA-2026-0041',
  'Registro de Marca Comercial — "SNACKPLUS El Salvador"',
  'Registro de marca comercial para la denominación "SNACKPLUS El Salvador" en Clase 30 (snacks, galletas, cereales) y Clase 32 (bebidas no alcohólicas, jugos). Emitido por el Centro Nacional de Registros bajo la Ley de Marcas y Otros Signos Distintivos. Renovable cada 10 años.',
  'Operativo', 'CNR', 'San Salvador',
  'Vigente', '2026-01-20', '2026-02-15', '2036-02-15',
  'e1afaec6-637c-40d5-b6df-4a801cf25311', 'Ana María Rodriguez',
  ARRAY['marca', 'CNR', 'propiedad-intelectual', 'largo-plazo']
)

ON CONFLICT DO NOTHING;
