-- ============================================================
-- LEXIA — SEED: Permisos Teknergy (Comercializadora de Bebidas y Snacks)
-- Tenant: Teknergy (8edff51b-aeff-4e1c-a083-6f6ed6335c59)
-- Contexto: El Salvador — datos realistas de demo
-- ============================================================

-- ─── 1. UBICACIONES ──────────────────────────────────────────
INSERT INTO ubicaciones (id, tenant_id, nombre, ciudad, departamento, activo) VALUES
  ('b2222222-2222-2222-2222-222222222201', '8edff51b-aeff-4e1c-a083-6f6ed6335c59', 'San Salvador', 'San Salvador', 'San Salvador', true),
  ('b2222222-2222-2222-2222-222222222202', '8edff51b-aeff-4e1c-a083-6f6ed6335c59', 'Soyapango',    'Soyapango',    'San Salvador', true),
  ('b2222222-2222-2222-2222-222222222203', '8edff51b-aeff-4e1c-a083-6f6ed6335c59', 'Santa Ana',    'Santa Ana',    'Santa Ana',    true)
ON CONFLICT (id) DO NOTHING;

-- ─── 2. RESPONSABLES ─────────────────────────────────────────
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
  tipo, entidad_reguladora, ubicacion, ubicacion_id,
  estado, fecha_solicitud, fecha_emision, fecha_vencimiento,
  responsable_id, responsable_nombre, etiquetas,
  base_legal, riesgo_incumplimiento, base_legal_incumplimiento
) VALUES

-- 1. Pre-Renovación · vence en ~1 mes (2026-08-29)
(
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'MINSAL-RS-2024-0318',
  'Registro Sanitario — Bebidas de Frutas Tropicales (Línea Frut-T)',
  'Registro sanitario para la distribución de bebidas no carbonatadas a base de frutas tropicales. Incluye variedades mango, maracuyá y piña. Emitido originalmente en 2024, requiere renovación inmediata.',
  'Sanitario', 'MINSAL', 'San Salvador', 'b2222222-2222-2222-2222-222222222201',
  'Actualizar Permiso', '2024-07-15', '2024-08-01', '2026-08-29',
  'e1afaec6-637c-40d5-b6df-4a801cf25311', 'Ana María Rodriguez',
  ARRAY['registro-sanitario', 'bebidas', 'renovacion-urgente'],
  'Art. 86 del Código de Salud (D.L. No. 955); Reglamento General de Alimentos (D.E. No. 59); Reglamento Técnico Centroamericano RTCA 67.01.60:10 (Etiquetado de Alimentos Preenvasados).',
  'Suspensión inmediata de la comercialización del producto en todo el territorio nacional. Decomiso de inventario en almacenes y puntos de venta. Multa entre $500 y $11,428. Daño reputacional ante clientes y distribuidores.',
  'Art. 233 del Código de Salud: sanción de $114 a $11,428 por operar sin registro sanitario vigente. Art. 234: facultad del MINSAL para ordenar retiro de productos del mercado.'
),

-- 2. Pre-Renovación · vence en ~6 semanas (2026-09-10)
(
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'ALCALDIA-SS-2024-0891',
  'Permiso Municipal de Operación — Bodega Central San Salvador',
  'Autorización municipal para operación de bodega de almacenamiento y distribución de bebidas y snacks. Ubicada en Blvd. del Ejército, km 5, San Salvador. Área: 2,400 m².',
  'Operativo', 'Alcaldía Municipal', 'San Salvador', 'b2222222-2222-2222-2222-222222222201',
  'Actualizar Permiso', '2024-08-20', '2024-09-05', '2026-09-10',
  'a1111111-1111-1111-1111-111111111101', 'Carlos Ernesto Molina',
  ARRAY['operacion', 'bodega', 'alcaldia', 'renovacion-urgente'],
  'Ordenanza Reguladora de la Actividad Comercial e Industrial del Municipio de San Salvador; Ley General Tributaria Municipal (D.L. No. 86, Art. 3); Ley de Urbanismo y Construcción.',
  'Cierre temporal del establecimiento por orden municipal. Multa de hasta $2,000 por operar con permiso vencido. Imposibilidad de renovar otros permisos vinculados a la misma dirección. Impacto en operaciones de distribución de toda la zona metropolitana.',
  'Art. 4 de la Ordenanza Municipal de San Salvador: operación sin permiso vigente es infracción grave sancionable con clausura. Art. 106 de la Ley General Tributaria Municipal: multa de $114 a $11,428.'
),

-- 3. Vigente · vence en ~3 meses (2026-10-31)
(
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'MINEC-IMP-2025-0144',
  'Permiso de Importación Definitiva — Bebidas Carbonatadas y Energéticas',
  'Autorización de importación para bebidas carbonatadas y energéticas provenientes de Guatemala y Honduras. Incluye marcas distribuidas bajo acuerdo de exclusividad regional. Requiere cumplimiento del Reglamento Técnico Centroamericano RTCA 67.04.54:10.',
  'Importación', 'MINEC', 'San Salvador', 'b2222222-2222-2222-2222-222222222201',
  'Aprobado', '2025-09-01', '2025-10-15', '2026-10-31',
  'a1111111-1111-1111-1111-111111111103', 'Roberto Alfredo Gutiérrez',
  ARRAY['importacion', 'bebidas-carbonatadas', 'RTCA'],
  'Reglamento Técnico Centroamericano RTCA 67.04.54:10 (Bebidas Carbonatadas); Ley de Simplificación Aduanera (D.L. No. 529); Arancel Centroamericano de Importación (SAC), Sección IV, Capítulo 22; Acuerdo de Libre Comercio DR-CAFTA, Anexo de Desgravación Arancelaria.',
  'Retención y devolución de la mercadería en puertos de entrada. Multa aduanera de hasta el 100% del valor CIF de la importación. Suspensión del registro de importador ante la DGA. Pérdida de exclusividad de distribución con proveedores internacionales.',
  'Art. 13 de la Ley de Simplificación Aduanera: infracción por declaración incorrecta o sin autorización vigente. Art. 8 del Reglamento Técnico RTCA 67.04.54:10: prohibición de comercialización de productos sin registro.'
),

-- 4. Vigente · vence en ~5 meses (2026-12-20)
(
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'MINSAL-LF-2025-0507',
  'Licencia de Funcionamiento — Planta de Almacenamiento y Distribución',
  'Licencia sanitaria de funcionamiento para instalaciones de almacenamiento, manipulación y distribución de alimentos empacados (snacks, galletas, frituras). Emitida bajo normativa del Código de Salud Art. 86 y Reglamento de Alimentos.',
  'Sanitario', 'MINSAL', 'Soyapango', 'b2222222-2222-2222-2222-222222222202',
  'Aprobado', '2025-10-01', '2025-11-20', '2026-12-20',
  'a1111111-1111-1111-1111-111111111102', 'María José Cisneros',
  ARRAY['licencia-funcionamiento', 'alimentos', 'snacks', 'MINSAL'],
  'Art. 86 y 87 del Código de Salud (D.L. No. 955); Reglamento de Buenas Prácticas de Manufactura para Alimentos Procesados (D.E. No. 67); Norma Salvadoreña Obligatoria NSO 67.20.01:06 (Condiciones de almacenamiento de alimentos).',
  'Clausura temporal o definitiva de las instalaciones por orden del MINSAL. Multa entre $1,000 y $50,000 según gravedad. Decomiso de productos almacenados. Inhabilitación para operar como distribuidor de alimentos. Responsabilidad civil ante clientes por incumplimiento contractual.',
  'Art. 233 del Código de Salud: clausura de establecimiento y multa de $114 a $11,428. Art. 3 del Reglamento BPM: incumplimiento de condiciones sanitarias es causal de suspensión de licencia.'
),

-- 5. En Revisión · vence en ~7 meses (2027-02-28)
(
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'MINSAL-RS-2026-0082',
  'Registro Sanitario — Snacks y Frituras Empacadas (Línea CrunchMax)',
  'Solicitud de registro sanitario para nueva línea de snacks: papas fritas, churritos y palomitas de maíz saborizadas. Actualmente en proceso de revisión de documentación técnica por parte del MINSAL. Análisis microbiológico y fisicoquímico en laboratorio acreditado.',
  'Sanitario', 'MINSAL', 'San Salvador', 'b2222222-2222-2222-2222-222222222201',
  'Presentado', '2026-01-10', NULL, '2027-02-28',
  'a1111111-1111-1111-1111-111111111102', 'María José Cisneros',
  ARRAY['registro-sanitario', 'snacks', 'en-proceso'],
  'Art. 86 del Código de Salud; RTCA 67.04.50:08 (Criterios Microbiológicos para la Inocuidad de Alimentos); RTCA 67.01.60:10 (Etiquetado de Alimentos Preenvasados); Reglamento de Alimentos (D.E. No. 59, Art. 6 y 7).',
  'Mientras el registro esté pendiente, los productos de la Línea CrunchMax no pueden comercializarse legalmente en El Salvador ni en el territorio centroamericano. Riesgo de que distribuidores y cadenas de supermercados rechacen el producto. Pérdida de ventana de entrada al mercado frente a competidores.',
  'Art. 86 del Código de Salud: prohibición expresa de comercializar alimentos sin registro sanitario vigente. Art. 4 del Reglamento de Alimentos: multa y decomiso de producto no registrado.'
),

-- 6. Vigente · vence en ~11 meses (2027-06-30)
(
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'MARN-AA-2025-0267',
  'Autorización Ambiental de Actividad — Centro de Distribución Soyapango',
  'Autorización ambiental para operación del centro de distribución. Incluye manejo de residuos sólidos, emisiones de gases por flota vehicular y vertido de aguas residuales industriales. Sujeto a seguimiento semestral del MARN y presentación de informe de cumplimiento ambiental.',
  'Ambiental', 'MARN', 'Soyapango', 'b2222222-2222-2222-2222-222222222202',
  'Aprobado', '2025-04-15', '2025-06-30', '2027-06-30',
  'a1111111-1111-1111-1111-111111111103', 'Roberto Alfredo Gutiérrez',
  ARRAY['ambiental', 'MARN', 'centro-distribucion'],
  'Art. 21 de la Ley de Medio Ambiente (D.L. No. 233): toda actividad, obra o proyecto con impacto ambiental requiere Autorización Ambiental previa. Reglamento General de la Ley de Medio Ambiente (D.E. No. 17, Art. 16 al 30). Sistema de Gestión Ambiental Empresarial (SGAE) del MARN.',
  'Paralización inmediata de operaciones del centro de distribución por orden del MARN. Multa de hasta $11,428.57 por día de operación sin autorización. Responsabilidad penal para el representante legal de la empresa. Impacto reputacional y pérdida de certificaciones internacionales de calidad.',
  'Art. 86 de la Ley de Medio Ambiente: multa de $1,142.86 a $11,428.57 y paralización. Art. 255 del Código Penal: daños al medio ambiente por descuido o negligencia conllevan pena de 4 a 8 años de prisión para el responsable.'
),

-- 7. En Trámite · vence provisional en ~14 meses (2027-09-15)
(
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'ALCALDIA-SAN-2026-0345',
  'Permiso Municipal de Operación — Punto de Distribución Santa Ana',
  'Trámite de autorización municipal para apertura de nuevo punto de distribución en Santa Ana. Se presentó expediente completo en abril 2026. Pendiente de visita de inspección municipal. Fecha estimada de emisión: Q3 2026.',
  'Operativo', 'Alcaldía Municipal', 'Santa Ana', 'b2222222-2222-2222-2222-222222222203',
  'En Gestión', '2026-04-03', NULL, '2027-09-15',
  'a1111111-1111-1111-1111-111111111101', 'Carlos Ernesto Molina',
  ARRAY['operacion', 'apertura', 'santa-ana'],
  'Ordenanza Municipal para el Ejercicio de Actividades Comerciales e Industriales del Municipio de Santa Ana; Ley General Tributaria Municipal (Art. 3 y 90); Ley de Urbanismo y Construcción (D.L. No. 232, Art. 5).',
  'Operación sin permiso expone a la empresa a cierre inmediato por la Alcaldía de Santa Ana. Multa municipal de hasta $1,500. Imposibilidad de emitir facturas con dirección del nuevo establecimiento ante el MH. Riesgo de conflicto con vecinos o denuncias ante la alcaldía.',
  'Art. 5 de la Ordenanza Municipal de Santa Ana: operar sin permiso vigente es infracción grave. Ley General Tributaria Municipal, Art. 106: multa de $57 a $5,714 por incumplimiento de obligaciones municipales.'
),

-- 8. Vigente · vence en ~18 meses (2028-01-10)
(
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'MH-DISTRIB-2026-0019',
  'Licencia de Distribución de Bebidas con Contenido Alcohólico',
  'Licencia del Ministerio de Hacienda para distribución mayorista de bebidas alcohólicas (cervezas, vinos y licores importados). Sujeta al pago del Impuesto sobre el Alcohol y Bebidas Alcohólicas (Ley Reguladora de la Producción y Comercialización del Alcohol). Aplica a nivel nacional.',
  'Tributario', 'Ministerio de Hacienda', 'San Salvador', 'b2222222-2222-2222-2222-222222222201',
  'Aprobado', '2026-01-05', '2026-01-20', '2028-01-10',
  'a1111111-1111-1111-1111-111111111103', 'Roberto Alfredo Gutiérrez',
  ARRAY['bebidas-alcoholicas', 'licencia-distribucion', 'ministerio-hacienda'],
  'Ley Reguladora de la Producción y Comercialización del Alcohol y de las Bebidas Alcohólicas (D.L. No. 439), Art. 3 y 12: obligación de obtener licencia para distribuir bebidas alcohólicas. Reglamento de la Ley (D.E. No. 96). Código Tributario, Art. 162: retención y pago del impuesto sobre bebidas alcohólicas.',
  'Decomiso de todo el inventario de bebidas alcohólicas en bodegas y en tránsito. Multa de hasta $57,142. Cancelación definitiva de la licencia sin posibilidad de renovación por 5 años. Responsabilidad penal para el representante legal. Resolución anticipada de contratos de distribución con proveedores internacionales.',
  'Art. 48 de la Ley Reguladora del Alcohol: multa de $2,857 a $57,142 y cancelación de licencia por distribución sin autorización. Art. 216 del Código Penal: pena de 2 a 5 años de prisión por comercio ilegal de bebidas alcohólicas.'
),

-- 9. Suspendido · vence en ~9 meses (2027-04-30)
(
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'MINSAL-MS-2025-0203',
  'Permiso de Manipulación de Alimentos — Personal Operativo (Planta Soyapango)',
  'Permiso de manipulación de alimentos para 45 empleados de planta de almacenamiento. Suspendido temporalmente por MINSAL el 14 de junio 2026 tras inspección que detectó deficiencias en registros de control de temperatura en cámara fría. Requiere capacitación BPM y nueva inspección para reactivación.',
  'Sanitario', 'MINSAL', 'Soyapango', 'b2222222-2222-2222-2222-222222222202',
  'Rechazado', '2025-03-01', '2025-04-10', '2027-04-30',
  'a1111111-1111-1111-1111-111111111102', 'María José Cisneros',
  ARRAY['manipulacion-alimentos', 'BPM', 'suspendido', 'accion-requerida'],
  'Art. 55 y 56 del Código de Salud: obligación de capacitar y certificar al personal manipulador de alimentos. Reglamento de Buenas Prácticas de Manufactura (D.E. No. 67, Art. 8): el personal debe contar con carnet de manipulación de alimentos vigente. Norma NSO 67.20.01:06.',
  'Suspensión de operaciones de la planta de almacenamiento hasta subsanar la deficiencia. Nueva multa del MINSAL de $500 por cada empleado sin permiso vigente. Riesgo de contaminación cruzada que podría derivar en retiro masivo de productos. Pérdida de certificaciones de inocuidad alimentaria con clientes corporativos.',
  'Art. 233 del Código de Salud: operar con personal sin carnet de manipulación vigente es infracción sancionable con multa de $114 a $11,428 y clausura. Art. 3 del Reglamento BPM: incumplimiento de requisitos de personal es causal de suspensión de licencia de funcionamiento.'
),

-- 10. Vigente · vence en ~10 años (marca comercial — 2036-02-15)
(
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'CNR-MARCA-2026-0041',
  'Registro de Marca Comercial — "SNACKPLUS El Salvador"',
  'Registro de marca comercial para la denominación "SNACKPLUS El Salvador" en Clase 30 (snacks, galletas, cereales) y Clase 32 (bebidas no alcohólicas, jugos). Emitido por el Centro Nacional de Registros bajo la Ley de Marcas y Otros Signos Distintivos. Renovable cada 10 años.',
  'Operativo', 'CNR', 'San Salvador', 'b2222222-2222-2222-2222-222222222201',
  'Aprobado', '2026-01-20', '2026-02-15', '2036-02-15',
  'e1afaec6-637c-40d5-b6df-4a801cf25311', 'Ana María Rodriguez',
  ARRAY['marca', 'CNR', 'propiedad-intelectual', 'largo-plazo'],
  'Ley de Marcas y Otros Signos Distintivos (D.L. No. 868), Art. 5: la marca otorga derecho exclusivo de uso en el territorio nacional. Art. 8: protección en Clase 30 (snacks, galletas) y Clase 32 (bebidas no alcohólicas). Convenio de París para la Protección de la Propiedad Industrial (ratificado por El Salvador). Acuerdo sobre los ADPIC (OMC).',
  'Sin registro vigente, terceros podrían registrar la misma marca o una similar y obtener derechos exclusivos sobre ella. Pérdida de la identidad comercial de la línea de productos. Imposibilidad de demandar por infracción de marca a competidores. Riesgo de litigios costosos para recuperar el uso exclusivo.',
  'Art. 73 de la Ley de Marcas: uso no autorizado de marca registrada por un tercero faculta al titular a exigir cese, daños y perjuicios. Art. 226 del Código Penal: uso fraudulento de marca ajena conlleva pena de 2 a 5 años de prisión y multa de $2,000 a $20,000.'
)

ON CONFLICT DO NOTHING;
