-- ============================================================
-- LEXIA — SEED: Tareas, Comentarios y Notas — Permisos Teknergy
-- Tenant: Teknergy (8edff51b-aeff-4e1c-a083-6f6ed6335c59)
-- Usuarios:
--   Hernán Osorio  67e8d065-4390-412b-b1e2-41299c9d79a3
--   Edgardo        4e0230e4-40fd-4bed-9a90-f220e42e69cd
-- ============================================================

-- ─── IDs de los 10 permisos ──────────────────────────────────
-- MINSAL-RS-2024-0318    47be3dcd-eb31-49cb-9c3b-39bd47d8264e
-- ALCALDIA-SS-2024-0891  1dfcea6a-76a7-41de-8890-3988d5698e5e
-- MINEC-IMP-2025-0144    34534be8-87bc-4102-bd1c-7fae72e74319
-- MINSAL-LF-2025-0507    62968608-ab93-4f8f-8ef2-e58b59c812c8
-- MINSAL-RS-2026-0082    29790c19-cd2f-4c43-840a-cf70c0c1edc7
-- MARN-AA-2025-0267      4da75ab0-384d-4f99-bb2e-dd15fd0dbf3c
-- ALCALDIA-SAN-2026-0345 7ae41cd0-2bef-44f4-b257-119e2aa30e9e
-- MH-DISTRIB-2026-0019   92b35021-3828-458d-8bed-42a838d6672a
-- MINSAL-MS-2025-0203    93ed0e61-4604-45e8-90ca-35c253e2c2b2
-- CNR-MARCA-2026-0041    ff0d5125-9d26-4631-8014-9069c2852cce
-- ─────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════
-- 1. TAREAS (2 por permiso = 20 tareas)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO tareas (
  id, tenant_id, titulo, descripcion,
  estado, prioridad,
  asignado_a, asignado_nombre,
  modulo_origen, recurso_id, recurso_desc,
  fecha_limite,
  created_by, created_by_nombre
) VALUES

-- ── MINSAL-RS-2024-0318 (Registro Sanitario Frut-T) ──────────
(
  'c1111111-0001-0001-0001-000000000001',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'Preparar documentación para renovación del Registro Sanitario Frut-T',
  'Recopilar análisis fisicoquímico y microbiológico actualizados, fichas técnicas y declaración de ingredientes para presentar ante el MINSAL antes del vencimiento.',
  'en_progreso', 'urgente',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  'permisos', '47be3dcd-eb31-49cb-9c3b-39bd47d8264e', 'Registro Sanitario — Bebidas de Frutas Tropicales (Línea Frut-T)',
  '2026-08-05',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio'
),
(
  'c1111111-0001-0001-0001-000000000002',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'Solicitar análisis microbiológico en laboratorio acreditado (MINSAL)',
  'Coordinar con LABIOFAM la realización del análisis de inocuidad requerido para la renovación del registro. Gestionar resultados en 15 días hábiles.',
  'pendiente', 'alta',
  '4e0230e4-40fd-4bed-9a90-f220e42e69cd', 'Edgardo',
  'permisos', '47be3dcd-eb31-49cb-9c3b-39bd47d8264e', 'Registro Sanitario — Bebidas de Frutas Tropicales (Línea Frut-T)',
  '2026-07-31',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio'
),

-- ── ALCALDIA-SS-2024-0891 (Permiso Municipal Bodega SS) ──────
(
  'c1111111-0001-0001-0001-000000000003',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'Pagar tasas municipales de renovación — Bodega San Salvador',
  'Tramitar el pago de tasas en la Alcaldía de San Salvador (ventanilla de Catastro). Monto estimado: $450 según tabla de tarifas vigente.',
  'pendiente', 'alta',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  'permisos', '1dfcea6a-76a7-41de-8890-3988d5698e5e', 'Permiso Municipal de Operación — Bodega Central San Salvador',
  '2026-08-20',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio'
),
(
  'c1111111-0001-0001-0001-000000000004',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'Presentar planos actualizados de la bodega a la Alcaldía',
  'Actualizar y presentar planos de distribución interna de la bodega ante la Unidad de Permisos y Licencias de la Alcaldía de San Salvador.',
  'completada', 'media',
  '4e0230e4-40fd-4bed-9a90-f220e42e69cd', 'Edgardo',
  'permisos', '1dfcea6a-76a7-41de-8890-3988d5698e5e', 'Permiso Municipal de Operación — Bodega Central San Salvador',
  '2026-06-30',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio'
),

-- ── MINEC-IMP-2025-0144 (Permiso Importación) ────────────────
(
  'c1111111-0001-0001-0001-000000000005',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'Iniciar trámite de renovación del Permiso de Importación — Q4 2026',
  'Presentar solicitud de renovación ante el MINEC con 60 días de anticipación. Adjuntar registros de importación del año en curso y cumplimiento RTCA.',
  'pendiente', 'media',
  '4e0230e4-40fd-4bed-9a90-f220e42e69cd', 'Edgardo',
  'permisos', '34534be8-87bc-4102-bd1c-7fae72e74319', 'Permiso de Importación Definitiva — Bebidas Carbonatadas y Energéticas',
  '2026-09-01',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio'
),
(
  'c1111111-0001-0001-0001-000000000006',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'Actualizar fichas técnicas RTCA con proveedor Honduras',
  'Solicitar a proveedor Refrescos Hondureños S.A. las fichas técnicas actualizadas de los productos bajo el RTCA 67.04.54:10 para adjuntar a la renovación del permiso.',
  'pendiente', 'baja',
  '4e0230e4-40fd-4bed-9a90-f220e42e69cd', 'Edgardo',
  'permisos', '34534be8-87bc-4102-bd1c-7fae72e74319', 'Permiso de Importación Definitiva — Bebidas Carbonatadas y Energéticas',
  '2026-08-30',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio'
),

-- ── MINSAL-LF-2025-0507 (Licencia Funcionamiento Planta) ─────
(
  'c1111111-0001-0001-0001-000000000007',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'Programar inspección de seguimiento MINSAL — Q4 2026',
  'Coordinar con el área técnica del MINSAL la visita de seguimiento anual a la planta de almacenamiento y distribución de Soyapango, conforme al plan de vigilancia sanitaria.',
  'pendiente', 'media',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  'permisos', '62968608-ab93-4f8f-8ef2-e58b59c812c8', 'Licencia de Funcionamiento — Planta de Almacenamiento y Distribución',
  '2026-11-01',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio'
),
(
  'c1111111-0001-0001-0001-000000000008',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'Instalar sistema de monitoreo de temperatura automatizado en cámara fría',
  'Adquirir e instalar datalogger con alertas automáticas para el control de temperatura de la cámara fría. Observación levantada por inspector MINSAL en última visita.',
  'en_progreso', 'alta',
  '4e0230e4-40fd-4bed-9a90-f220e42e69cd', 'Edgardo',
  'permisos', '62968608-ab93-4f8f-8ef2-e58b59c812c8', 'Licencia de Funcionamiento — Planta de Almacenamiento y Distribución',
  '2026-09-15',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio'
),

-- ── MINSAL-RS-2026-0082 (Registro Sanitario CrunchMax) ───────
(
  'c1111111-0001-0001-0001-000000000009',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'Dar seguimiento al expediente RS CrunchMax ante MINSAL',
  'Verificar semanalmente el estado del expediente en el portal del MINSAL y mantener comunicación con el técnico asignado, Dr. López. Objetivo: aprobación antes de octubre 2026.',
  'en_progreso', 'alta',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  'permisos', '29790c19-cd2f-4c43-840a-cf70c0c1edc7', 'Registro Sanitario — Snacks y Frituras Empacadas (Línea CrunchMax)',
  '2026-09-30',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio'
),
(
  'c1111111-0001-0001-0001-000000000010',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'Preparar respuesta a observaciones técnicas del MINSAL — CrunchMax',
  'Elaborar carta técnica y documentación complementaria para subsanar observaciones del MINSAL sobre el etiquetado nutricional de la línea CrunchMax.',
  'pendiente', 'media',
  '4e0230e4-40fd-4bed-9a90-f220e42e69cd', 'Edgardo',
  'permisos', '29790c19-cd2f-4c43-840a-cf70c0c1edc7', 'Registro Sanitario — Snacks y Frituras Empacadas (Línea CrunchMax)',
  '2026-08-25',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio'
),

-- ── MARN-AA-2025-0267 (Autorización Ambiental) ───────────────
(
  'c1111111-0001-0001-0001-000000000011',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'Elaborar Informe Semestral de Cumplimiento Ambiental — MARN',
  'Preparar el informe semestral con datos de generación de residuos sólidos, emisiones de la flota y consumo hídrico del centro de distribución para presentar al MARN antes del 30-Sep-2026.',
  'pendiente', 'alta',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  'permisos', '4da75ab0-384d-4f99-bb2e-dd15fd0dbf3c', 'Autorización Ambiental de Actividad — Centro de Distribución Soyapango',
  '2026-09-25',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio'
),
(
  'c1111111-0001-0001-0001-000000000012',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'Renovar contrato con empresa de gestión de residuos sólidos',
  'Gestionar la renovación del contrato con EcoSalva S.A. de C.V. para la recolección y disposición de residuos sólidos del centro de distribución. Contrato vence en diciembre 2026.',
  'pendiente', 'media',
  '4e0230e4-40fd-4bed-9a90-f220e42e69cd', 'Edgardo',
  'permisos', '4da75ab0-384d-4f99-bb2e-dd15fd0dbf3c', 'Autorización Ambiental de Actividad — Centro de Distribución Soyapango',
  '2026-11-30',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio'
),

-- ── ALCALDIA-SAN-2026-0345 (Permiso Municipal Santa Ana) ─────
(
  'c1111111-0001-0001-0001-000000000013',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'Coordinar visita de inspección con Alcaldía de Santa Ana',
  'Confirmar con el Ing. Cortez de la Alcaldía de Santa Ana la fecha y condiciones de la visita de inspección al nuevo punto de distribución. Asegurar presencia del representante legal.',
  'en_progreso', 'alta',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  'permisos', '7ae41cd0-2bef-44f4-b257-119e2aa30e9e', 'Permiso Municipal de Operación — Punto de Distribución Santa Ana',
  '2026-08-15',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio'
),
(
  'c1111111-0001-0001-0001-000000000014',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'Obtener certificado de uso de suelo — Punto Santa Ana',
  'Tramitar ante el Departamento de Planificación Urbana de la Alcaldía de Santa Ana el certificado de compatibilidad de uso de suelo. Requisito pendiente para completar el expediente.',
  'pendiente', 'urgente',
  '4e0230e4-40fd-4bed-9a90-f220e42e69cd', 'Edgardo',
  'permisos', '7ae41cd0-2bef-44f4-b257-119e2aa30e9e', 'Permiso Municipal de Operación — Punto de Distribución Santa Ana',
  '2026-08-10',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio'
),

-- ── MH-DISTRIB-2026-0019 (Licencia Bebidas Alcohólicas) ──────
(
  'c1111111-0001-0001-0001-000000000015',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'Presentar declaración mensual de impuesto al alcohol — Agosto 2026',
  'Completar y presentar el Formulario F-08 ante el Ministerio de Hacienda declarando el impuesto específico sobre bebidas alcohólicas distribuidas en julio 2026. Plazo: 20 de agosto.',
  'pendiente', 'alta',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  'permisos', '92b35021-3828-458d-8bed-42a838d6672a', 'Licencia de Distribución de Bebidas con Contenido Alcohólico',
  '2026-08-20',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio'
),
(
  'c1111111-0001-0001-0001-000000000016',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'Actualizar inventario reportable de bebidas alcohólicas',
  'Levantar inventario físico de bebidas alcohólicas en bodega para cuadrar con el reporte de ventas mensual requerido por el Ministerio de Hacienda conforme a la Ley Reguladora del Alcohol.',
  'pendiente', 'media',
  '4e0230e4-40fd-4bed-9a90-f220e42e69cd', 'Edgardo',
  'permisos', '92b35021-3828-458d-8bed-42a838d6672a', 'Licencia de Distribución de Bebidas con Contenido Alcohólico',
  '2026-08-10',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio'
),

-- ── MINSAL-MS-2025-0203 (Permiso Manipulación Alimentos) ─────
(
  'c1111111-0001-0001-0001-000000000017',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'Inscribir personal en capacitación BPM — INSAFORP',
  'Registrar a los 45 empleados de planta en el curso de Buenas Prácticas de Manufactura de INSAFORP (modalidad online, 8 horas). Requisito para rehabilitar el permiso rechazado por el MINSAL.',
  'pendiente', 'urgente',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  'permisos', '93ed0e61-4604-45e8-90ca-35c253e2c2b2', 'Permiso de Manipulación de Alimentos — Personal Operativo (Planta Soyapango)',
  '2026-08-31',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio'
),
(
  'c1111111-0001-0001-0001-000000000018',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'Subsanar deficiencias en registros de control de temperatura',
  'Implementar bitácora digital de control de temperatura para la cámara fría, según los estándares del Reglamento BPM. Documentar y presentar evidencia al MINSAL para solicitar nueva inspección.',
  'en_progreso', 'urgente',
  '4e0230e4-40fd-4bed-9a90-f220e42e69cd', 'Edgardo',
  'permisos', '93ed0e61-4604-45e8-90ca-35c253e2c2b2', 'Permiso de Manipulación de Alimentos — Personal Operativo (Planta Soyapango)',
  '2026-08-15',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio'
),

-- ── CNR-MARCA-2026-0041 (Marca SNACKPLUS) ────────────────────
(
  'c1111111-0001-0001-0001-000000000019',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'Extender registro de marca SNACKPLUS a países del CA-4',
  'Iniciar trámite de registro de la marca "SNACKPLUS El Salvador" en Guatemala, Honduras y Nicaragua, aprovechando el sistema de registro regional del Convenio Centroamericano.',
  'pendiente', 'baja',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  'permisos', 'ff0d5125-9d26-4631-8014-9069c2852cce', 'Registro de Marca Comercial — "SNACKPLUS El Salvador"',
  '2027-02-15',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio'
),
(
  'c1111111-0001-0001-0001-000000000020',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'Implementar uso activo de la marca en materiales comerciales',
  'Coordinar con el equipo de marketing el uso correcto del logotipo y nombre "SNACKPLUS El Salvador" en empaques, material POP y redes sociales, conforme al certificado de registro CNR.',
  'completada', 'baja',
  '4e0230e4-40fd-4bed-9a90-f220e42e69cd', 'Edgardo',
  'permisos', 'ff0d5125-9d26-4631-8014-9069c2852cce', 'Registro de Marca Comercial — "SNACKPLUS El Salvador"',
  '2026-06-15',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio'
)

ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 2. COMENTARIOS (1-2 por permiso = 15 comentarios)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO comentarios (
  id, tenant_id, modulo, recurso_id,
  user_id, user_nombre, contenido, editado, created_at
) VALUES

-- MINSAL-RS-2024-0318
(
  'd1111111-0001-0001-0001-000000000001',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', '47be3dcd-eb31-49cb-9c3b-39bd47d8264e',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  '<p>El MINSAL solicitó actualizar el análisis fisicoquímico del producto antes de aprobar la renovación. El técnico indicó que los resultados no deben tener más de 6 meses de antigüedad al momento de la presentación.</p>',
  false,
  '2026-07-10 09:15:00+00'
),
(
  'd1111111-0001-0001-0001-000000000002',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', '47be3dcd-eb31-49cb-9c3b-39bd47d8264e',
  '4e0230e4-40fd-4bed-9a90-f220e42e69cd', 'Edgardo',
  '<p>Confirmado con LABIOFAM: tienen disponibilidad para recibir muestras a partir del lunes 14 de julio. El resultado estará listo en 12 días hábiles. Costo: $380 incluyendo análisis microbiológico y fisicoquímico.</p>',
  false,
  '2026-07-11 14:32:00+00'
),

-- ALCALDIA-SS-2024-0891
(
  'd1111111-0001-0001-0001-000000000003',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', '1dfcea6a-76a7-41de-8890-3988d5698e5e',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  '<p>La Alcaldía requiere presentación de planos actualizados de distribución del local. Carlos confirmó que los planos fueron entregados el 28 de junio y están en revisión en el departamento de urbanismo.</p>',
  false,
  '2026-07-02 10:00:00+00'
),

-- MINEC-IMP-2025-0144
(
  'd1111111-0001-0001-0001-000000000004',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', '34534be8-87bc-4102-bd1c-7fae72e74319',
  '4e0230e4-40fd-4bed-9a90-f220e42e69cd', 'Edgardo',
  '<p>Permiso renovado exitosamente hasta octubre 2026. Para la próxima renovación se debe iniciar el trámite con al menos 60 días de anticipación. El MINEC actualiza los requisitos en enero de cada año.</p>',
  false,
  '2025-10-20 08:45:00+00'
),

-- MINSAL-LF-2025-0507
(
  'd1111111-0001-0001-0001-000000000005',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', '62968608-ab93-4f8f-8ef2-e58b59c812c8',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  '<p>El inspector del MINSAL recomendó instalar un sistema de monitoreo de temperatura automatizado con alertas para la cámara fría. Esta observación queda registrada en el acta de inspección y debe subsanarse antes de la próxima visita.</p>',
  false,
  '2025-11-25 16:20:00+00'
),
(
  'd1111111-0001-0001-0001-000000000006',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', '62968608-ab93-4f8f-8ef2-e58b59c812c8',
  '4e0230e4-40fd-4bed-9a90-f220e42e69cd', 'Edgardo',
  '<p>Cotizamos con tres proveedores de dataloggers. La mejor opción es el modelo ThermoGuard Pro con telemetría WiFi y app móvil: $280 instalado. La compra fue aprobada por gerencia y está en proceso de adquisición.</p>',
  false,
  '2026-06-15 11:10:00+00'
),

-- MINSAL-RS-2026-0082
(
  'd1111111-0001-0001-0001-000000000007',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', '29790c19-cd2f-4c43-840a-cf70c0c1edc7',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  '<p>El expediente fue admitido formalmente el 15 de enero 2026 con número de radicación EXP-RS-26-0082. El tiempo de resolución estimado es de 90 días hábiles, lo que da una fecha aproximada de resolución para finales de mayo. Sin embargo, aún no hay respuesta.</p>',
  false,
  '2026-05-30 09:00:00+00'
),

-- MARN-AA-2025-0267
(
  'd1111111-0001-0001-0001-000000000008',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', '4da75ab0-384d-4f99-bb2e-dd15fd0dbf3c',
  '4e0230e4-40fd-4bed-9a90-f220e42e69cd', 'Edgardo',
  '<p>El MARN realizó visita de seguimiento el 10 de marzo 2026. No se levantaron observaciones. El inspector confirmó que el plan de manejo de residuos está siendo implementado correctamente. Se entregó acta firmada.</p>',
  false,
  '2026-03-11 13:45:00+00'
),

-- ALCALDIA-SAN-2026-0345
(
  'd1111111-0001-0001-0001-000000000009',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', '7ae41cd0-2bef-44f4-b257-119e2aa30e9e',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  '<p>La inspectoría municipal de Santa Ana confirmó visita para el 20 de agosto de 2026 a las 9:00 AM. Se requiere presencia del representante legal y tener disponibles todos los documentos del expediente. Confirmar asistencia al Ing. Cortez (tel. 2441-0000).</p>',
  false,
  '2026-07-22 08:30:00+00'
),

-- MH-DISTRIB-2026-0019
(
  'd1111111-0001-0001-0001-000000000010',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', '92b35021-3828-458d-8bed-42a838d6672a',
  '4e0230e4-40fd-4bed-9a90-f220e42e69cd', 'Edgardo',
  '<p>Licencia vigente hasta enero 2028. Requiere declaración mensual del impuesto específico al alcohol mediante el Formulario F-08 ante el MH. El plazo de presentación es el día 20 de cada mes siguiente al período declarado.</p>',
  false,
  '2026-01-25 10:00:00+00'
),

-- MINSAL-MS-2025-0203
(
  'd1111111-0001-0001-0001-000000000011',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', '93ed0e61-4604-45e8-90ca-35c253e2c2b2',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  '<p>El MINSAL rechazó la solicitud el 14 de junio 2026 tras inspección que detectó deficiencias en los registros de control de temperatura de la cámara fría. Para reactivar el permiso se requiere: (1) capacitación BPM del personal, (2) implementar bitácora de temperatura, (3) solicitar nueva inspección.</p>',
  false,
  '2026-06-15 15:00:00+00'
),
(
  'd1111111-0001-0001-0001-000000000012',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', '93ed0e61-4604-45e8-90ca-35c253e2c2b2',
  '4e0230e4-40fd-4bed-9a90-f220e42e69cd', 'Edgardo',
  '<p>INSAFORP ofrece el curso BPM en modalidad online con certificación válida para el MINSAL. El registro es gratuito con NIT empresarial. Duración: 8 horas. Disponible de lunes a viernes. Podemos inscribir a todo el personal en dos grupos esta semana.</p>',
  false,
  '2026-07-05 09:20:00+00'
),

-- CNR-MARCA-2026-0041
(
  'd1111111-0001-0001-0001-000000000013',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', 'ff0d5125-9d26-4631-8014-9069c2852cce',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  '<p>Marca registrada exitosamente el 15 de febrero 2026. El certificado original está resguardado en el archivo legal de la empresa. Se realizó una copia certificada para el expediente digital. Registro en Clase 30 (snacks) y Clase 32 (bebidas no alcohólicas).</p>',
  false,
  '2026-02-18 11:00:00+00'
)

ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 3. NOTAS (1-2 por permiso = 15 notas)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO notas (
  id, tenant_id, modulo, recurso_id,
  contenido, user_id, user_nombre, created_at
) VALUES

-- MINSAL-RS-2024-0318
(
  'e1111111-0001-0001-0001-000000000001',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', '47be3dcd-eb31-49cb-9c3b-39bd47d8264e',
  '<p><strong>Laboratorio acreditado para análisis:</strong> LABIOFAM — tel. 2228-0000. Costo análisis fisicoquímico + microbiológico: <strong>$380</strong>. Tiempo de respuesta: 12 días hábiles. Entregar muestras en Av. Los Diplomáticos, Colonia San Benito.</p>',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  '2026-07-08 10:00:00+00'
),

-- ALCALDIA-SS-2024-0891
(
  'e1111111-0001-0001-0001-000000000002',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', '1dfcea6a-76a7-41de-8890-3988d5698e5e',
  '<p><strong>Formulario de renovación:</strong> disponible en ventanilla 3, Palacio Municipal de San Salvador. Horario de atención: 8:00 AM – 4:00 PM, lunes a viernes. <strong>Documentos requeridos:</strong> NIT, DUI del representante legal, solvencia municipal vigente y planos del local.</p>',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  '2026-06-20 09:00:00+00'
),
(
  'e1111111-0001-0001-0001-000000000003',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', '1dfcea6a-76a7-41de-8890-3988d5698e5e',
  '<p>Monto de tasa municipal estimado para renovación 2026: <strong>$450</strong> (clase C, bodega &gt;1,000 m²). Pago puede hacerse en efectivo o mediante transferencia bancaria a cuenta de la Alcaldía. Conservar comprobante original.</p>',
  '4e0230e4-40fd-4bed-9a90-f220e42e69cd', 'Edgardo',
  '2026-07-14 14:00:00+00'
),

-- MINEC-IMP-2025-0144
(
  'e1111111-0001-0001-0001-000000000004',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', '34534be8-87bc-4102-bd1c-7fae72e74319',
  '<p><strong>Contacto DGA:</strong> Ing. Roberto Fuentes — rfuentes@aduana.gob.sv — tel. 2244-3200. <strong>Código arancelario:</strong> 2202.10.00 (bebidas carbonatadas). Próxima renovación: iniciar trámite antes del <strong>1-Sep-2026</strong>.</p>',
  '4e0230e4-40fd-4bed-9a90-f220e42e69cd', 'Edgardo',
  '2025-10-18 11:30:00+00'
),

-- MINSAL-LF-2025-0507
(
  'e1111111-0001-0001-0001-000000000005',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', '62968608-ab93-4f8f-8ef2-e58b59c812c8',
  '<p><strong>Última inspección:</strong> 20-Nov-2025. Inspector: Lic. Morales (MINSAL Soyapango). Resultado: <strong>Aprobado con observaciones menores</strong>. Observación principal: instalar sensor automatizado de temperatura en cámara fría. Plazo subsanación: 6 meses.</p>',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  '2025-11-21 08:00:00+00'
),

-- MINSAL-RS-2026-0082
(
  'e1111111-0001-0001-0001-000000000006',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', '29790c19-cd2f-4c43-840a-cf70c0c1edc7',
  '<p><strong>Radicación interna MINSAL:</strong> EXP-RS-26-0082. <strong>Técnico asignado:</strong> Dr. López — tel. 2209-0000. Consulta de estado: portal MINSAL &gt; Servicios en línea &gt; Registro Sanitario. Credenciales de acceso guardadas en el gestor de contraseñas corporativo.</p>',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  '2026-01-16 10:30:00+00'
),

-- MARN-AA-2025-0267
(
  'e1111111-0001-0001-0001-000000000007',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', '4da75ab0-384d-4f99-bb2e-dd15fd0dbf3c',
  '<p><strong>Empresa gestión de residuos:</strong> EcoSalva S.A. de C.V. — tel. 7899-0000. Contrato vigente hasta <strong>diciembre 2026</strong>. Frecuencia de recolección: 2 veces por semana. <strong>Próximo informe semestral MARN:</strong> entregar antes del 30-Sep-2026.</p>',
  '4e0230e4-40fd-4bed-9a90-f220e42e69cd', 'Edgardo',
  '2025-07-05 09:00:00+00'
),

-- ALCALDIA-SAN-2026-0345
(
  'e1111111-0001-0001-0001-000000000008',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', '7ae41cd0-2bef-44f4-b257-119e2aa30e9e',
  '<p><strong>Contacto Alcaldía Santa Ana:</strong> Ing. Cortez — tel. 2441-0000 ext. 115 — jcortez@alcaldiasantaana.gob.sv. Horario de atención: 8:00 AM – 3:30 PM. <strong>Expediente asignado:</strong> ventanilla 7, Unidad de Permisos y Licencias. Documentos pendientes: certificado de uso de suelo.</p>',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  '2026-04-05 08:00:00+00'
),

-- MH-DISTRIB-2026-0019
(
  'e1111111-0001-0001-0001-000000000009',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', '92b35021-3828-458d-8bed-42a838d6672a',
  '<p><strong>Código de contribuyente MH:</strong> 0614-280290-101-2. <strong>Formulario:</strong> F-08 para declaración mensual de bebidas alcohólicas. Presentación: Ministerio de Hacienda, 4a Calle Poniente. <strong>Plazo:</strong> día 20 de cada mes. Multa por no presentar: $500 más intereses.</p>',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  '2026-01-22 09:30:00+00'
),

-- MINSAL-MS-2025-0203
(
  'e1111111-0001-0001-0001-000000000010',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', '93ed0e61-4604-45e8-90ca-35c253e2c2b2',
  '<p><strong>Entidad acreditada para capacitación BPM:</strong> INSAFORP — curso online disponible en insaforp.org.sv. Duración: 8 horas. <strong>Costo: gratuito</strong> con NIT empresarial. Certificado con validez MINSAL. Se deben inscribir los 45 empleados antes del 31-Ago-2026.</p>',
  '4e0230e4-40fd-4bed-9a90-f220e42e69cd', 'Edgardo',
  '2026-06-20 11:00:00+00'
),
(
  'e1111111-0001-0001-0001-000000000011',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', '93ed0e61-4604-45e8-90ca-35c253e2c2b2',
  '<p><strong>Pasos para rehabilitar el permiso tras rechazo MINSAL:</strong></p><ol><li>Completar capacitación BPM de todo el personal (certificado INSAFORP).</li><li>Implementar bitácora digital de temperatura en cámara fría.</li><li>Solicitar nueva inspección al MINSAL con carta formal.</li><li>Adjuntar evidencias fotográficas de las mejoras implementadas.</li></ol>',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  '2026-06-18 15:30:00+00'
),

-- CNR-MARCA-2026-0041
(
  'e1111111-0001-0001-0001-000000000012',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'permisos', 'ff0d5125-9d26-4631-8014-9069c2852cce',
  '<p><strong>Número de registro CNR:</strong> M-2026-0041. <strong>Clases:</strong> 30 (snacks, galletas, cereales) y 32 (bebidas no alcohólicas, jugos). <strong>Vigencia:</strong> 10 años, renovable en febrero 2036. <strong>Contacto CNR:</strong> tel. 2593-0000, Edificio CNR, 1a Av. Norte. Certificado original en caja fuerte gerencia.</p>',
  '67e8d065-4390-412b-b1e2-41299c9d79a3', 'Hernán Osorio',
  '2026-02-17 10:00:00+00'
)

ON CONFLICT (id) DO NOTHING;
