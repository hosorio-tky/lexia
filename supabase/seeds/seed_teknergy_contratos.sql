-- ============================================================
-- LEXIA — SEED: Contratos Teknergy (Comercializadora de Bebidas y Snacks)
-- Tenant: Teknergy (8edff51b-aeff-4e1c-a083-6f6ed6335c59)
-- Tipos (enum contrato_tipo): Servicio, Suministro, Laboral, Arrendamiento, Confidencialidad, Otro
-- Estados (frontend CONTRACT_ESTADOS): En Revisión, Pendiente Firma, Vigente, Vencido, Terminado, Cancelado
-- Responsables:
--   Ana María Rodriguez       e1afaec6-637c-40d5-b6df-4a801cf25311  Legal
--   Carlos Ernesto Molina     a1111111-1111-1111-1111-111111111101  Operaciones
--   María José Cisneros       a1111111-1111-1111-1111-111111111102  Regulatorio y Cumplimiento
--   Roberto Alfredo Gutiérrez a1111111-1111-1111-1111-111111111103  Importaciones y Comercio Exterior
-- Creado por: Hernán Osorio   67e8d065-4390-412b-b1e2-41299c9d79a3
-- ============================================================

INSERT INTO contratos (
  id, tenant_id,
  numero, titulo, descripcion, tipo, estado,
  contraparte_nombre, contraparte_email,
  valor, moneda,
  fecha_inicio, fecha_fin, fecha_firma,
  responsable_id, responsable_nombre,
  created_by
) VALUES

-- ── 1. Suministro de bebidas carbonatadas — Proveedor Honduras ───────────────
(
  'f1111111-1111-1111-1111-000000000001',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'TKN-SUM-2025-001',
  'Contrato de Suministro — Bebidas Carbonatadas y Energéticas (Refrescos Hondureños S.A.)',
  'Acuerdo de suministro exclusivo de bebidas carbonatadas y energéticas provenientes de Honduras. Incluye marcas distribuidas bajo exclusividad regional. Volumen mínimo mensual: 15,000 unidades. Precio fijo por SKU con ajuste semestral por IPC. Entrega CIF en bodega San Salvador.',
  'Suministro', 'Vigente',
  'Refrescos Hondureños S.A. de C.V.', 'ventas@refrescosdhn.com',
  144000.00, 'USD',
  '2025-01-01', '2026-12-31', '2024-12-20',
  'a1111111-1111-1111-1111-111111111103', 'Roberto Alfredo Gutiérrez',
  '67e8d065-4390-412b-b1e2-41299c9d79a3'
),

-- ── 2. Suministro de snacks — Proveedor Guatemala ────────────────────────────
(
  'f1111111-1111-1111-1111-000000000002',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'TKN-SUM-2025-002',
  'Contrato de Suministro — Snacks y Frituras (Alimentos del Altiplano S.A.)',
  'Contrato de suministro para snacks, papas fritas y palomitas de maíz saborizadas bajo la línea CrunchMax. Comprende producción por maquila bajo especificaciones técnicas de Teknergy. Exclusividad de distribución en El Salvador y Honduras. Precio por lote de 500 unidades.',
  'Suministro', 'Vigente',
  'Alimentos del Altiplano S.A.', 'contratos@altiplanofoods.com.gt',
  520000.00, 'GTQ',
  '2026-01-15', '2027-01-14', '2026-01-10',
  'a1111111-1111-1111-1111-111111111103', 'Roberto Alfredo Gutiérrez',
  '67e8d065-4390-412b-b1e2-41299c9d79a3'
),

-- ── 3. Arrendamiento — Bodega Central San Salvador ───────────────────────────
(
  'f1111111-1111-1111-1111-000000000003',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'TKN-ARR-2022-001',
  'Contrato de Arrendamiento — Bodega Central San Salvador (Blvd. del Ejército km 5)',
  'Arrendamiento de nave industrial de 2,400 m² ubicada en Blvd. del Ejército km 5, San Salvador. Incluye área de carga y descarga, cámara fría de 200 m², oficinas administrativas y vigilancia 24/7. Canon mensual: $3,500 USD. Reajuste anual según IPC El Salvador.',
  'Arrendamiento', 'Vigente',
  'Inmobiliaria Centroamericana S.A. de C.V.', 'arrendamientos@inmobiliariaca.com',
  3500.00, 'USD',
  '2022-06-01', '2027-05-31', '2022-05-25',
  'a1111111-1111-1111-1111-111111111101', 'Carlos Ernesto Molina',
  '67e8d065-4390-412b-b1e2-41299c9d79a3'
),

-- ── 4. Arrendamiento — Punto de Distribución Santa Ana ───────────────────────
(
  'f1111111-1111-1111-1111-000000000004',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'TKN-ARR-2026-002',
  'Contrato de Arrendamiento — Punto de Distribución Santa Ana',
  'Arrendamiento de local comercial de 450 m² en Av. Independencia, Santa Ana, destinado a centro de distribución regional zona occidental. Canon mensual: $1,800 USD. Contrato condicionado a la obtención del Permiso Municipal de Operación ante la Alcaldía de Santa Ana.',
  'Arrendamiento', 'En Revisión',
  'Bienes Raíces del Occidente Ltda.', 'gerencia@brocsa.com.sv',
  1800.00, 'USD',
  '2026-09-01', '2028-08-31', NULL,
  'a1111111-1111-1111-1111-111111111101', 'Carlos Ernesto Molina',
  '67e8d065-4390-412b-b1e2-41299c9d79a3'
),

-- ── 5. Servicio de Transporte y Distribución ─────────────────────────────────
(
  'f1111111-1111-1111-1111-000000000005',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'TKN-SVC-2025-001',
  'Contrato de Servicios de Transporte y Distribución — LogiSV Transportes',
  'Servicio de transporte y distribución de mercadería (bebidas y snacks) a nivel nacional. Flota mínima asignada: 8 camiones con capacidad de 5 toneladas. Incluye seguro de carga, GPS y reportería de entregas. Tarifa mensual fija: $8,200 USD más variable por km adicional. Cobertura: 14 departamentos de El Salvador.',
  'Servicio', 'Vigente',
  'LogiSV Transportes S.A. de C.V.', 'operaciones@logisv.com.sv',
  98400.00, 'USD',
  '2025-03-01', '2026-02-28', '2025-02-22',
  'a1111111-1111-1111-1111-111111111101', 'Carlos Ernesto Molina',
  '67e8d065-4390-412b-b1e2-41299c9d79a3'
),

-- ── 6. Servicio de Asesoría Legal ────────────────────────────────────────────
(
  'f1111111-1111-1111-1111-000000000006',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'TKN-SVC-2026-002',
  'Contrato de Servicios de Asesoría Legal Corporativa — Bufete Hernández & Asociados',
  'Retención mensual para asesoría legal en materia corporativa, regulatoria y de cumplimiento. Incluye: revisión y negociación de contratos comerciales, gestión de permisos y licencias, atención de requerimientos legales de entidades reguladoras (MINSAL, MARN, MH) y representación en procedimientos administrativos. Honorarios: $2,500 USD/mes.',
  'Servicio', 'Pendiente Firma',
  'Bufete Hernández & Asociados', 'ahernandez@bufetehernandez.com.sv',
  30000.00, 'USD',
  '2026-08-01', '2027-07-31', NULL,
  'e1afaec6-637c-40d5-b6df-4a801cf25311', 'Ana María Rodriguez',
  '67e8d065-4390-412b-b1e2-41299c9d79a3'
),

-- ── 7. Laboral — Contrato Colectivo Personal de Planta ──────────────────────
(
  'f1111111-1111-1111-1111-000000000007',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'TKN-LAB-2025-001',
  'Contrato Colectivo de Trabajo — Personal Operativo Planta Soyapango',
  'Contrato colectivo suscrito entre Teknergy y el sindicato de trabajadores de planta (SITRASAV), que rige las condiciones laborales de los 45 empleados operativos del centro de distribución de Soyapango. Incluye salarios, prestaciones adicionales al mínimo legal, jornadas, vacaciones y cláusula de resolución de conflictos. Vigente mientras no sea denunciado por ninguna de las partes.',
  'Laboral', 'Vigente',
  'Sindicato de Trabajadores de Almacenamiento y Ventas (SITRASAV)', 'secretaria@sitrasav.org.sv',
  NULL, 'USD',
  '2025-01-01', '2026-12-31', '2024-12-28',
  'a1111111-1111-1111-1111-111111111102', 'María José Cisneros',
  '67e8d065-4390-412b-b1e2-41299c9d79a3'
),

-- ── 8. Confidencialidad — Proveedor maquila CrunchMax ────────────────────────
(
  'f1111111-1111-1111-1111-000000000008',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'TKN-NDA-2026-001',
  'Acuerdo de Confidencialidad y No Divulgación — Alimentos del Altiplano S.A. (Línea CrunchMax)',
  'NDA recíproco suscrito con el proveedor de maquila de la línea CrunchMax. Protege las fórmulas, procesos de producción, listas de ingredientes, precios y estrategias comerciales compartidas durante la negociación y ejecución del contrato de suministro TKN-SUM-2025-002. Vigencia: 5 años desde la firma. Penalización por incumplimiento: $50,000 USD.',
  'Confidencialidad', 'Vigente',
  'Alimentos del Altiplano S.A.', 'legal@altiplanofoods.com.gt',
  NULL, 'USD',
  '2026-01-05', '2031-01-04', '2026-01-05',
  'e1afaec6-637c-40d5-b6df-4a801cf25311', 'Ana María Rodriguez',
  '67e8d065-4390-412b-b1e2-41299c9d79a3'
),

-- ── 9. Suministro — Empaque y Etiquetas (vencido) ────────────────────────────
(
  'f1111111-1111-1111-1111-000000000009',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'TKN-SUM-2024-003',
  'Contrato de Suministro — Material de Empaque y Etiquetas (PackSV S.A. de C.V.)',
  'Contrato de suministro de material de empaque (cajas corrugadas, stretch film, etiquetas adhesivas con código de barras) para la operación de almacenamiento y distribución. Volumen estimado: 50,000 unidades de empaque por mes. Precio unitario fijo por 12 meses. Contrato vencido, pendiente de renovación con ajuste de precios.',
  'Suministro', 'Vencido',
  'PackSV S.A. de C.V.', 'ventas@packsv.com.sv',
  48000.00, 'USD',
  '2024-07-01', '2025-06-30', '2024-06-28',
  'a1111111-1111-1111-1111-111111111103', 'Roberto Alfredo Gutiérrez',
  '67e8d065-4390-412b-b1e2-41299c9d79a3'
),

-- ── 10. Servicio — Mantenimiento de Equipos de Refrigeración ────────────────
(
  'f1111111-1111-1111-1111-000000000010',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'TKN-SVC-2026-003',
  'Contrato de Mantenimiento Preventivo y Correctivo — Equipos de Refrigeración y Cámara Fría',
  'Contrato de mantenimiento preventivo mensual y correctivo ilimitado para los equipos de refrigeración y cámara fría del centro de distribución de Soyapango. Incluye: revisión mensual de compresores, cambio de filtros, monitoreo de gases refrigerantes y atención de emergencias 24/7 con tiempo de respuesta máximo de 4 horas. Tarifa mensual: $650 USD.',
  'Servicio', 'Vigente',
  'RefriTech El Salvador S.A. de C.V.', 'servicio@refrigtech.com.sv',
  7800.00, 'USD',
  '2026-02-01', '2027-01-31', '2026-01-28',
  'a1111111-1111-1111-1111-111111111102', 'María José Cisneros',
  '67e8d065-4390-412b-b1e2-41299c9d79a3'
)

ON CONFLICT (id) DO NOTHING;
