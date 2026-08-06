-- ============================================================
-- LEXIA — SEED DEMO El Salvador
-- Contratos, Permisos y Tareas de ejemplo
-- NUNCA incluir en producción
-- ============================================================

-- ─── PERMISOS ADICIONALES ────────────────────────────────────
INSERT INTO permisos (
  tenant_id, numero_expediente, nombre,
  tipo, entidad_reguladora, ubicacion,
  estado, fecha_solicitud, fecha_emision, fecha_vencimiento, responsable_nombre
) VALUES
  ('00000000-0000-0000-0000-000000000001', 'MTPS-LAB-2025-0471',    'Permiso de Trabajo para Extranjeros',                  'Laboral',      'MTPS',               'San Salvador',   'Vigente',        '2025-03-10', '2025-04-01', '2026-04-01', 'Roberto Villalta'),
  ('00000000-0000-0000-0000-000000000001', 'CNR-REG-2025-0088',     'Registro de Marca Comercial — Bebidas Selectas',        'Operativo',    'CNR',                'San Salvador',   'Vigente',        '2025-01-05', '2025-02-20', '2035-02-20', 'Elena Guzmán'),
  ('00000000-0000-0000-0000-000000000001', 'MARN-IVA-2026-0019',    'Permiso de vertido de aguas residuales',                'Ambiental',    'MARN',               'Ilopango',       'En Trámite',     '2026-01-20', null,         '2027-01-20', 'Mario Zelaya'),
  ('00000000-0000-0000-0000-000000000001', 'MINSAL-FS-2025-0330',   'Licencia de Funcionamiento — Planta Procesadora',       'Sanitario',    'MINSAL',             'San Miguel',     'Vigente',        '2025-06-01', '2025-07-10', '2026-07-10', 'Verónica Amaya'),
  ('00000000-0000-0000-0000-000000000001', 'ALCALDIA-SS-2025-1102', 'Permiso de Rótulo y Publicidad Exterior',               'Operativo',    'Alcaldía Municipal', 'San Salvador',   'Vigente',        '2025-08-15', '2025-09-01', '2026-09-01', 'Fernanda Chávez'),
  ('00000000-0000-0000-0000-000000000001', 'MARN-EST-2026-0044',    'Estudio de Impacto Ambiental — Ampliación de Planta',   'Ambiental',    'MARN',               'Soyapango',      'Requisitos',     '2026-02-10', null,         '2027-06-30', 'Jorge Morales'),
  ('00000000-0000-0000-0000-000000000001', 'MINEC-EXP-2025-0217',   'Registro de Exportador — DGA',                          'Operativo',    'MINEC',              'San Salvador',   'Vigente',        '2025-04-01', '2025-05-15', '2026-05-15', 'Carmen Salinas'),
  ('00000000-0000-0000-0000-000000000001', 'SSF-SEG-2025-0063',     'Póliza de Seguro Obligatorio de Instalaciones',         'Operativo',    'SSF',                'Santa Ana',      'Pre-Renovación', '2022-09-01', '2022-10-01', '2026-06-30', 'Andrés Portillo'),
  ('00000000-0000-0000-0000-000000000001', 'MTPS-RSSS-2026-0099',   'Inscripción al ISSS y AFP — Nuevos empleados',          'Laboral',      'MTPS',               'San Salvador',   'En Revisión',    '2026-03-01', null,         '2027-03-01', 'Isabela Moreno'),
  ('00000000-0000-0000-0000-000000000001', 'ALCALDIA-APO-2025-0777','Permiso Municipal de Operación — Bodega Ahuachapán',     'Operativo',    'Alcaldía Municipal', 'Ahuachapán',     'Vigente',        '2025-07-01', '2025-08-01', '2026-08-01', 'Tomás Fuentes')
ON CONFLICT DO NOTHING;

-- ─── CONTRATOS ───────────────────────────────────────────────
INSERT INTO contratos (
  tenant_id, numero, titulo, tipo, estado,
  contraparte_nombre, contraparte_email,
  valor, moneda,
  fecha_inicio, fecha_fin, fecha_firma,
  responsable_nombre, descripcion
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'CTR-2025-001', 'Contrato de Suministro de Materia Prima — Azúcar',
    'Suministro', 'Vigente',
    'Ingenio La Cabaña S.A. de C.V.', 'compras@lacabana.com.sv',
    85000, 'USD', '2025-01-01', '2025-12-31', '2024-12-20',
    'Roberto Villalta',
    'Suministro mensual de azúcar refinada para línea de bebidas carbonatadas.'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'CTR-2025-002', 'Contrato de Arrendamiento — Bodega Santa Tecla',
    'Arrendamiento', 'Vigente',
    'Inmuebles del Pacífico S.A.', 'arriendo@inmpacific.com.sv',
    24000, 'USD', '2025-03-01', '2027-02-28', '2025-02-15',
    'Elena Guzmán',
    'Arrendamiento de bodega de 1,200 m² en el parque industrial de Santa Tecla.'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'CTR-2025-003', 'Contrato de Servicios de Transporte y Distribución',
    'Servicio', 'Vigente',
    'Transportes Centroamérica S.A.', 'operaciones@transcam.com.sv',
    36000, 'USD', '2025-04-01', '2026-03-31', '2025-03-25',
    'Mario Zelaya',
    'Distribución de productos terminados a nivel nacional, 5 rutas departamentales.'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'CTR-2025-004', 'Contrato Laboral — Gerente de Operaciones',
    'Laboral', 'Vigente',
    'Ing. Carlos Ernesto Rivas Molina', null,
    28800, 'USD', '2025-05-01', null, '2025-04-28',
    'Fernanda Chávez',
    'Contrato por tiempo indefinido conforme al Código de Trabajo de El Salvador.'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'CTR-2025-005', 'Acuerdo de Confidencialidad — Fórmula de Bebida Energética',
    'Confidencialidad', 'Vigente',
    'Laboratorios BioFarma El Salvador', 'legal@biofarma.com.sv',
    0, 'USD', '2025-06-01', '2030-05-31', '2025-05-30',
    'Elena Guzmán',
    'NDA recíproco para proceso de desarrollo conjunto de nueva fórmula energética.'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'CTR-2025-006', 'Contrato de Suministro de Envases PET',
    'Suministro', 'En Revisión',
    'Plásticos Modernos de C.A.', 'ventas@plasticosmca.com',
    52000, 'USD', null, '2026-06-30', null,
    'Verónica Amaya',
    'Suministro de botellas PET de 500ml y 1L. Contrato en proceso de revisión legal.'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'CTR-2025-007', 'Contrato de Mantenimiento de Maquinaria Industrial',
    'Servicio', 'Vigente',
    'TecnoServ Industrial S.A. de C.V.', 'servicio@tecnoserv.sv',
    18000, 'USD', '2025-07-01', '2026-06-30', '2025-06-25',
    'Jorge Morales',
    'Mantenimiento preventivo y correctivo de línea de embotellado. 12 visitas anuales.'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'CTR-2025-008', 'Contrato de Publicidad y Mercadeo Digital',
    'Servicio', 'Vencido',
    'Agencia Creativa El Salvador LTDA', 'cuentas@agenciacreativa.sv',
    15000, 'USD', '2024-07-01', '2025-06-30', '2024-06-28',
    'Carmen Salinas',
    'Gestión de redes sociales, pauta digital y diseño de campañas publicitarias.'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'CTR-2026-001', 'Contrato de Consultoría Legal Regulatoria',
    'Servicio', 'En Revisión',
    'Bufete Castellanos & Asociados', 'info@castellanoslaw.sv',
    24000, 'USD', null, '2026-12-31', null,
    'Andrés Portillo',
    'Asesoría legal en trámites regulatorios ante MARN, MINSAL y entidades municipales.'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'CTR-2026-002', 'Contrato de Arrendamiento — Planta Ilopango',
    'Arrendamiento', 'Borrador',
    'Grupo Industrial del Oriente S.A.', 'gerencia@gioeste.sv',
    120000, 'USD', null, '2031-05-31', null,
    'Tomás Fuentes',
    'Arrendamiento de planta industrial de 4,500 m² para nueva línea de producción.'
  )
ON CONFLICT DO NOTHING;

-- ─── TAREAS ──────────────────────────────────────────────────
INSERT INTO tareas (
  tenant_id, titulo, descripcion,
  estado, prioridad,
  asignado_nombre, fecha_limite,
  created_by_nombre
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Renovar Registro Sanitario de bebida carbonatada',
    'Iniciar trámite ante MINSAL para renovación del RS-2026-0142 antes del vencimiento.',
    'en_progreso', 'alta',
    'Ana López', '2026-05-15', 'Admin Demo'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Revisar y firmar contrato de suministro de envases PET',
    'Coordinar con el área legal la revisión final del CTR-2025-006 y obtener firmas.',
    'pendiente', 'alta',
    'Verónica Amaya', '2026-05-20', 'Admin Demo'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Preparar documentación para Estudio de Impacto Ambiental',
    'Recopilar planos, memorias técnicas y reportes de producción para envío al MARN.',
    'en_progreso', 'urgente',
    'Jorge Morales', '2026-05-10', 'Admin Demo'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Gestionar póliza de seguro SSF ante vencimiento próximo',
    'Contactar a SSF y al corredor de seguros para renovar póliza SSF-SEG-2025-0063.',
    'pendiente', 'alta',
    'Andrés Portillo', '2026-06-01', 'Admin Demo'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Contratar nueva agencia de publicidad digital',
    'Solicitar propuestas a 3 agencias para reemplazar contrato CTR-2025-008 vencido.',
    'pendiente', 'media',
    'Carmen Salinas', '2026-06-15', 'Admin Demo'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Inscribir nuevos empleados al ISSS y AFP',
    'Completar formularios MTPS-RSSS-2026-0099 para 8 nuevos empleados de planta.',
    'en_progreso', 'urgente',
    'Isabela Moreno', '2026-05-08', 'Admin Demo'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Revisar términos del contrato de arrendamiento Planta Ilopango',
    'Revisión legal del borrador CTR-2026-002 con el bufete Castellanos & Asociados.',
    'pendiente', 'media',
    'Tomás Fuentes', '2026-06-30', 'Admin Demo'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Obtener permiso de rótulo para nueva sede Santa Ana',
    'Presentar solicitud ante la Alcaldía de Santa Ana con planos y memoria técnica.',
    'pendiente', 'baja',
    'Fernanda Chávez', '2026-07-01', 'Admin Demo'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Auditoría interna de permisos ambientales MARN',
    'Verificar vigencia y cumplimiento de condicionantes de todos los permisos MARN activos.',
    'pendiente', 'media',
    'Mario Zelaya', '2026-05-30', 'Admin Demo'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Actualizar expediente de Registro de Exportador DGA',
    'Presentar documentos actualizados ante MINEC para renovación anual.',
    'completada', 'media',
    'Carmen Salinas', '2026-04-30', 'Admin Demo'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Negociar renovación de contrato de transporte',
    'Reunión con Transportes Centroamérica para negociar nuevas tarifas CTR-2025-003.',
    'pendiente', 'alta',
    'Mario Zelaya', '2026-08-01', 'Admin Demo'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Verificar cumplimiento de condicionantes ambientales Soyapango',
    'Revisar informe de seguimiento semestral del permiso MARN-AA-2025-0902.',
    'completada', 'media',
    'Juan Pérez', '2026-04-15', 'Admin Demo'
  )
ON CONFLICT DO NOTHING;
