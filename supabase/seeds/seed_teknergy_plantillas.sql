-- ============================================================
-- LEXIA — SEED: Plantillas de Contratos — Teknergy
-- Tenant: 8edff51b-aeff-4e1c-a083-6f6ed6335c59
-- Creado por: Hernán Osorio (67e8d065-4390-412b-b1e2-41299c9d79a3)
-- ============================================================

INSERT INTO contrato_plantillas (id, tenant_id, nombre, tipo, descripcion, contenido_html, created_by)
VALUES

-- ── 1. Servicios de Tecnología ────────────────────────────────────────────────
(
  'a0000001-0000-0000-0000-000000000001',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'Contrato de Servicios de Tecnología',
  'Servicio',
  'Plantilla para contratar empresas o consultores de TI. Cubre objeto, valor, forma de pago, entregables, confidencialidad y propiedad intelectual.',
  '<p><strong>CONTRATO DE PRESTACIÓN DE SERVICIOS DE TECNOLOGÍA DE LA INFORMACIÓN</strong></p>
<p><strong>Número de Contrato: {{NUMERO_CONTRATO}}</strong></p>
<p>En la ciudad de San Salvador, a los {{DIA_FIRMA}} días del mes de {{MES_FIRMA}} del año {{ANIO_FIRMA}}.</p>
<p>Entre <strong>TEKNERGY S.A. DE C.V.</strong> (en adelante "EL CONTRATANTE"), con NIT 0614-150310-101-5, representada por su Gerente General, Lic. Hernán Eduardo Osorio Reyes; y <strong>{{CONTRAPARTE}}</strong> (en adelante "EL PRESTADOR"), con NIT {{CONTRAPARTE_NIT}}, con domicilio en {{CONTRAPARTE_DIRECCION}}, representada por {{REPRESENTANTE_LEGAL}}, en su calidad de {{CARGO_REPRESENTANTE}}; se celebra el presente Contrato de Prestación de Servicios de Tecnología, sujeto a las siguientes cláusulas:</p>
<p><strong>CLÁUSULA I — OBJETO</strong></p>
<p>El presente contrato tiene por objeto la prestación de los siguientes servicios de tecnología de la información: {{OBJETO_SERVICIO}}. Los entregables específicos, plazos parciales y criterios de aceptación se detallan en el Anexo Técnico que forma parte integrante del presente instrumento.</p>
<p><strong>CLÁUSULA II — PLAZO</strong></p>
<p>El plazo de ejecución del contrato es de {{PLAZO_MESES}} meses, contados a partir del {{FECHA_INICIO}} hasta el {{FECHA_FIN}}. El contrato podrá prorrogarse por acuerdo escrito de las partes con al menos quince (15) días de anticipación al vencimiento.</p>
<p><strong>CLÁUSULA III — VALOR Y FORMA DE PAGO</strong></p>
<p>El valor total del presente contrato es de {{VALOR_LETRAS}} ({{MONEDA}} {{VALOR_TOTAL}}), más el IVA aplicable. El pago se realizará de la siguiente forma:</p>
<ol>
<li>{{PAGO_ANTICIPO}}% de anticipo a la firma del contrato.</li>
<li>{{PAGO_AVANCE}}% contra la entrega y aprobación del informe de avance.</li>
<li>{{PAGO_FINAL}}% al cierre y aceptación formal de todos los entregables.</li>
</ol>
<p>Los pagos se realizarán mediante transferencia bancaria a la cuenta indicada por EL PRESTADOR dentro de los cinco (5) días hábiles siguientes a la presentación de la factura correspondiente.</p>
<p><strong>CLÁUSULA IV — OBLIGACIONES DEL PRESTADOR</strong></p>
<ol>
<li>Ejecutar los servicios con la debida diligencia profesional y conforme a los estándares de la industria.</li>
<li>Asignar personal calificado y con experiencia comprobable en las tecnologías requeridas.</li>
<li>Entregar informes de avance con la periodicidad acordada en el Anexo Técnico.</li>
<li>Corregir, sin costo adicional, cualquier defecto o error en los entregables dentro de los treinta (30) días siguientes a la aceptación formal.</li>
<li>Cumplir con las políticas de seguridad de la información de EL CONTRATANTE.</li>
</ol>
<p><strong>CLÁUSULA V — PROPIEDAD INTELECTUAL</strong></p>
<p>Todos los desarrollos, códigos fuente, documentación, diseños y demás productos intelectuales generados en ejecución del presente contrato serán propiedad exclusiva de EL CONTRATANTE desde el momento de su creación. EL PRESTADOR cede irrevocablemente todos los derechos patrimoniales sobre dichos productos sin costo adicional.</p>
<p><strong>CLÁUSULA VI — CONFIDENCIALIDAD</strong></p>
<p>EL PRESTADOR se compromete a mantener absoluta reserva sobre toda la información técnica, comercial y operativa de EL CONTRATANTE a la que tenga acceso. Esta obligación se extiende por cinco (5) años contados desde la terminación del contrato. El incumplimiento faculta a EL CONTRATANTE a exigir daños y perjuicios sin perjuicio de las acciones penales aplicables.</p>
<p><strong>CLÁUSULA VII — RESOLUCIÓN</strong></p>
<p>Cualquiera de las partes podrá resolver el contrato por incumplimiento grave, previa notificación escrita con quince (15) días para subsanar. En caso de resolución imputable a EL PRESTADOR, deberá devolver los pagos recibidos por servicios no ejecutados y pagar una penalidad equivalente al {{PENALIDAD}}% del valor total del contrato.</p>
<p><strong>CLÁUSULA VIII — LEGISLACIÓN APLICABLE</strong></p>
<p>El presente contrato se rige por las leyes de la República de El Salvador. Para cualquier controversia, las partes se someten a los Tribunales Civiles y Mercantiles de San Salvador.</p>
<p>En fe de lo anterior, las partes suscriben el presente contrato en dos ejemplares de igual valor, en el lugar y fecha indicados al inicio.</p>
<p><strong>POR EL CONTRATANTE:</strong> TEKNERGY S.A. DE C.V.</p>
<p><strong>POR EL PRESTADOR:</strong> {{CONTRAPARTE}}</p>',
  '67e8d065-4390-412b-b1e2-41299c9d79a3'
),

-- ── 2. Contrato de Trabajo ────────────────────────────────────────────────────
(
  'a0000001-0000-0000-0000-000000000002',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'Contrato Individual de Trabajo',
  'Laboral',
  'Plantilla de contrato laboral individual para empleados nuevos. Incluye cargo, salario, jornada, prestaciones y condiciones conforme al Código de Trabajo de El Salvador.',
  '<p><strong>CONTRATO INDIVIDUAL DE TRABAJO</strong></p>
<p>En la ciudad de San Salvador, a los {{DIA_FIRMA}} días del mes de {{MES_FIRMA}} del año {{ANIO_FIRMA}}, celebran el presente Contrato Individual de Trabajo:</p>
<p><strong>TEKNERGY S.A. DE C.V.</strong> (en adelante "EL EMPLEADOR"), con NIT 0614-150310-101-5, domiciliada en Colonia Escalón, Calle La Mascota No. 620, San Salvador, representada por su Gerente General, Lic. Hernán Eduardo Osorio Reyes; y el señor/señora <strong>{{EMPLEADO_NOMBRE}}</strong> (en adelante "EL TRABAJADOR"), mayor de edad, con DUI número {{EMPLEADO_DUI}}, con domicilio en {{EMPLEADO_DIRECCION}}.</p>
<p><strong>CLÁUSULA I — NATURALEZA Y CARGO</strong></p>
<p>EL EMPLEADOR contrata a EL TRABAJADOR para desempeñar el cargo de <strong>{{CARGO}}</strong>, adscrito al área de <strong>{{DEPARTAMENTO}}</strong>. Las funciones específicas del puesto se detallan en el Perfil de Cargo entregado al momento de la contratación.</p>
<p><strong>CLÁUSULA II — DURACIÓN</strong></p>
<p>El presente contrato es de {{TIPO_CONTRATO}} y entrará en vigencia el día {{FECHA_INICIO}}. {{CLAUSULA_DURACION}}</p>
<p><strong>CLÁUSULA III — LUGAR DE TRABAJO</strong></p>
<p>EL TRABAJADOR prestará sus servicios en {{LUGAR_TRABAJO}}. EL EMPLEADOR podrá requerir la prestación de servicios en otras instalaciones de la empresa o en sitios de clientes, cuando las necesidades operativas así lo exijan, conforme al Artículo 21 del Código de Trabajo.</p>
<p><strong>CLÁUSULA IV — JORNADA LABORAL</strong></p>
<p>La jornada de trabajo será de {{JORNADA_HORAS}} horas diarias, {{JORNADA_DIAS}}, para un total de {{JORNADA_SEMANAL}} horas semanales, conforme a lo establecido en el Artículo 161 del Código de Trabajo. El horario ordinario será de {{HORARIO_INICIO}} a {{HORARIO_FIN}}.</p>
<p><strong>CLÁUSULA V — SALARIO</strong></p>
<p>EL EMPLEADOR pagará a EL TRABAJADOR un salario mensual de <strong>{{SALARIO_LETRAS}} ({{MONEDA}} {{SALARIO_MENSUAL}})</strong>, pagadero en forma {{FORMA_PAGO}} por los medios acordados entre las partes. Este salario incluye todos los conceptos remunerativos ordinarios. Las horas extraordinarias se pagarán conforme al Código de Trabajo.</p>
<p><strong>CLÁUSULA VI — PRESTACIONES</strong></p>
<p>EL TRABAJADOR tendrá derecho a todas las prestaciones establecidas en el Código de Trabajo y demás legislación laboral vigente en El Salvador, incluyendo:</p>
<ol>
<li>Vacaciones anuales remuneradas de quince (15) días hábiles, conforme al Artículo 177 C.T.</li>
<li>Aguinaldo anual según las disposiciones de la Ley Reguladora de la Prestación Económica por Renuncia Voluntaria.</li>
<li>Seguro Social (ISSS) e inscripción al Sistema de Ahorro para Pensiones (SAP) conforme a ley.</li>
<li>{{PRESTACIONES_ADICIONALES}}</li>
</ol>
<p><strong>CLÁUSULA VII — OBLIGACIONES DEL TRABAJADOR</strong></p>
<ol>
<li>Desempeñar sus funciones con diligencia, eficiencia y conforme a las instrucciones de sus superiores.</li>
<li>Guardar absoluta discreción sobre la información confidencial, datos de clientes y procesos internos de EL EMPLEADOR.</li>
<li>Cumplir con el Reglamento Interno de Trabajo y las políticas de la empresa.</li>
<li>Abstenerse de realizar actividades que generen conflicto de intereses con EL EMPLEADOR durante la vigencia del contrato.</li>
</ol>
<p><strong>CLÁUSULA VIII — TERMINACIÓN</strong></p>
<p>El presente contrato podrá darse por terminado conforme a las causales establecidas en el Código de Trabajo de El Salvador. En caso de renuncia voluntaria, EL TRABAJADOR deberá avisar con {{PREAVISO_DIAS}} días de anticipación.</p>
<p><strong>CLÁUSULA IX — LEGISLACIÓN APLICABLE</strong></p>
<p>El presente contrato se rige por el Código de Trabajo de la República de El Salvador y demás legislación laboral aplicable. Para cualquier controversia, las partes acudirán a la Dirección General de Trabajo o a los Juzgados de lo Laboral competentes.</p>
<p>Leído el presente instrumento y estando conformes con su contenido, las partes lo firman en dos ejemplares de igual valor.</p>
<p><strong>EL EMPLEADOR:</strong> TEKNERGY S.A. DE C.V.</p>
<p><strong>EL TRABAJADOR:</strong> {{EMPLEADO_NOMBRE}}</p>',
  '67e8d065-4390-412b-b1e2-41299c9d79a3'
),

-- ── 3. Compra de Materia Prima ────────────────────────────────────────────────
(
  'a0000001-0000-0000-0000-000000000003',
  '8edff51b-aeff-4e1c-a083-6f6ed6335c59',
  'Contrato de Compraventa de Materia Prima',
  'Suministro',
  'Plantilla para la compra de insumos o materia prima a proveedores. Incluye especificaciones del producto, precio, condiciones de entrega, control de calidad y penalidades.',
  '<p><strong>CONTRATO DE COMPRAVENTA DE MATERIA PRIMA E INSUMOS</strong></p>
<p><strong>Número de Contrato: {{NUMERO_CONTRATO}}</strong></p>
<p>En la ciudad de San Salvador, a los {{DIA_FIRMA}} días del mes de {{MES_FIRMA}} del año {{ANIO_FIRMA}}.</p>
<p>Entre <strong>TEKNERGY S.A. DE C.V.</strong> (en adelante "EL COMPRADOR"), con NIT 0614-150310-101-5, representada por su Gerente General, Lic. Hernán Eduardo Osorio Reyes; y <strong>{{PROVEEDOR}}</strong> (en adelante "EL VENDEDOR"), con NIT {{PROVEEDOR_NIT}}, con domicilio en {{PROVEEDOR_DIRECCION}}, representada por {{REPRESENTANTE_PROVEEDOR}}, en su calidad de {{CARGO_REPRESENTANTE}}; se celebra el presente Contrato de Compraventa de Materia Prima, bajo las siguientes cláusulas:</p>
<p><strong>CLÁUSULA I — OBJETO</strong></p>
<p>EL VENDEDOR se obliga a vender y EL COMPRADOR a comprar la siguiente materia prima e insumos (en adelante "LOS PRODUCTOS"):</p>
<ol>
<li><strong>Producto:</strong> {{MATERIA_PRIMA}}</li>
<li><strong>Especificaciones técnicas:</strong> {{ESPECIFICACIONES}}</li>
<li><strong>Cantidad:</strong> {{CANTIDAD}} {{UNIDAD_MEDIDA}}</li>
<li><strong>Presentación:</strong> {{PRESENTACION}}</li>
</ol>
<p><strong>CLÁUSULA II — PRECIO Y FORMA DE PAGO</strong></p>
<p>El precio unitario acordado es de <strong>{{MONEDA}} {{PRECIO_UNITARIO}}</strong> por {{UNIDAD_MEDIDA}}, para un valor total de <strong>{{VALOR_LETRAS}} ({{MONEDA}} {{VALOR_TOTAL}})</strong>, más el IVA de ley.</p>
<p>La forma de pago será: {{CONDICIONES_PAGO}}. Los pagos se realizarán mediante transferencia electrónica a la cuenta bancaria indicada por EL VENDEDOR, previa presentación de factura legal conforme a los requisitos del Ministerio de Hacienda de El Salvador.</p>
<p><strong>CLÁUSULA III — ENTREGA</strong></p>
<p>EL VENDEDOR se obliga a entregar LOS PRODUCTOS en las siguientes condiciones:</p>
<ol>
<li><strong>Lugar de entrega:</strong> {{LUGAR_ENTREGA}}</li>
<li><strong>Fecha de entrega:</strong> {{FECHA_ENTREGA}}</li>
<li><strong>Condición de entrega:</strong> {{CONDICION_ENTREGA}} (Incoterms 2020)</li>
<li><strong>Documentación:</strong> Factura original, lista de empaque, certificado de calidad y guía de transporte.</li>
</ol>
<p><strong>CLÁUSULA IV — CONTROL DE CALIDAD</strong></p>
<p>EL COMPRADOR tendrá un plazo de {{PLAZO_INSPECCION}} días hábiles contados desde la recepción para inspeccionar LOS PRODUCTOS y verificar que cumplen con las especificaciones pactadas. En caso de no conformidad, EL COMPRADOR notificará por escrito a EL VENDEDOR, quien deberá reponer o corregir los productos en un plazo no mayor de {{PLAZO_REPOSICION}} días calendario, sin costo adicional para EL COMPRADOR.</p>
<p><strong>CLÁUSULA V — GARANTÍAS</strong></p>
<p>EL VENDEDOR garantiza que LOS PRODUCTOS: (a) son de su propiedad y se encuentran libres de gravámenes; (b) cumplen con todas las normas técnicas y sanitarias aplicables en El Salvador; (c) cuentan con todos los registros y permisos sanitarios exigidos por el Ministerio de Salud (MINSAL) y el Centro Nacional de Registros (CNR) cuando aplique.</p>
<p><strong>CLÁUSULA VI — PENALIDADES</strong></p>
<p>En caso de incumplimiento en el plazo de entrega, EL VENDEDOR pagará a EL COMPRADOR una penalidad del {{PENALIDAD_DIARIA}}% del valor total del contrato por cada día hábil de retraso, hasta un máximo del {{PENALIDAD_MAXIMA}}% del valor total. Lo anterior sin perjuicio de la facultad de EL COMPRADOR de resolver el contrato y exigir daños y perjuicios.</p>
<p><strong>CLÁUSULA VII — VIGENCIA Y RENOVACIÓN</strong></p>
<p>El presente contrato tendrá vigencia desde la fecha de su firma hasta la entrega y aceptación total de LOS PRODUCTOS. Las partes podrán celebrar contratos sucesivos bajo las mismas condiciones mediante órdenes de compra emitidas por EL COMPRADOR y aceptadas por EL VENDEDOR.</p>
<p><strong>CLÁUSULA VIII — LEGISLACIÓN APLICABLE</strong></p>
<p>El presente contrato se rige por el Código de Comercio y el Código Civil de la República de El Salvador. Para cualquier controversia, las partes se someten a los Tribunales Civiles y Mercantiles de San Salvador, renunciando a cualquier otro fuero.</p>
<p>En fe de lo anterior, las partes suscriben el presente contrato en dos ejemplares de igual valor.</p>
<p><strong>EL COMPRADOR:</strong> TEKNERGY S.A. DE C.V.</p>
<p><strong>EL VENDEDOR:</strong> {{PROVEEDOR}}</p>',
  '67e8d065-4390-412b-b1e2-41299c9d79a3'
)

ON CONFLICT (id) DO NOTHING;
