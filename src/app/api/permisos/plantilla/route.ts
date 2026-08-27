import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createConfiguracionRepository } from "@/lib/repositories/configuracion";
import { createUbicacionesRepository } from "@/lib/repositories/ubicaciones";
import { createResponsablesRepository } from "@/lib/repositories/responsables";

export async function GET() {
  const session = await getSession();
  const client  = createAdminClient();

  async function fetchEstadosPermiso(): Promise<{ valor: string }[]> {
    try {
      const { data } = await client.from("workflow_estados").select("valor").eq("modulo", "permisos").order("orden");
      return (data ?? []) as { valor: string }[];
    } catch {
      return [];
    }
  }

  const [tipos, entidades, ubicaciones, responsables, estados] = await Promise.all([
    createConfiguracionRepository(client, session.tenant_id).getCatalogos("permisos", "tipo_permiso").catch(() => []),
    createConfiguracionRepository(client, session.tenant_id).getCatalogos("permisos", "entidad_reguladora").catch(() => []),
    createUbicacionesRepository(client, session.tenant_id).list().catch(() => []),
    createResponsablesRepository(client, session.tenant_id).list().catch(() => []),
    fetchEstadosPermiso(),
  ]);

  const wb = XLSX.utils.book_new();

  // ── Hoja principal: Datos ─────────────────────────────────
  const headers = [
    "nombre",
    "tipo",
    "numero_expediente",
    "entidad_reguladora",
    "ubicacion",
    "descripcion",
    "fecha_solicitud",
    "fecha_emision",
    "fecha_vencimiento",
    "responsable_nombre",
    "estado",
    "valor_tramite",
    "moneda",
    "base_legal",
    "riesgo_incumplimiento",
    "base_legal_incumplimiento",
    "tiene_provisional",
    "fecha_emision_provisional",
    "fecha_vencimiento_provisional",
  ];

  // Solo headers + datos de ejemplo. Sin fila de instrucciones
  // para que el parsing sea directo: fila 1 = headers, fila 2+ = datos.
  const ejemplo = [
    "Registro Sanitario Planta Norte",
    tipos[0]?.valor ?? "Sanitario",
    "SNT-0099",
    entidades[0]?.valor ?? "MINSAL",
    ubicaciones[0]?.nombre ?? "Planta Norte",
    "Registro sanitario para línea de producción",
    "01/01/2025",
    "15/03/2025",
    "15/03/2026",
    responsables[0]?.nombre ?? "Ana García",
    "Aprobado",
    "1500.00",
    "USD",
    "Reglamento Sanitario Art. 45",
    "Multa de hasta $10,000 y cierre temporal",
    "Base legal del riesgo de incumplimiento",
    "No",
    "",
    "",
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo]);

  // Anchos de columna
  ws["!cols"] = [
    { wch: 40 }, // nombre
    { wch: 16 }, // tipo
    { wch: 18 }, // numero_expediente
    { wch: 22 }, // entidad_reguladora
    { wch: 20 }, // ubicacion
    { wch: 40 }, // descripcion
    { wch: 16 }, // fecha_solicitud
    { wch: 16 }, // fecha_emision
    { wch: 18 }, // fecha_vencimiento
    { wch: 25 }, // responsable_nombre
    { wch: 22 }, // estado
    { wch: 14 }, // valor_tramite
    { wch: 10 }, // moneda
    { wch: 40 }, // base_legal
    { wch: 40 }, // riesgo_incumplimiento
    { wch: 40 }, // base_legal_incumplimiento
    { wch: 16 }, // tiene_provisional
    { wch: 22 }, // fecha_emision_provisional
    { wch: 24 }, // fecha_vencimiento_provisional
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Permisos");

  // ── Hoja de referencia: Instrucciones + Valores válidos ──
  // Los valores válidos se generan a partir de la configuración real del
  // tenant (catálogos, ubicaciones, responsables, estados) para que la
  // plantilla nunca quede desactualizada respecto al sistema.
  const tiposValidos        = tipos.map((c) => c.valor).join(", ") || "(configura tipos en Configuración → Catálogos)";
  const entidadesValidas    = entidades.map((c) => c.valor).join(", ") || "(opcional — configura en Configuración → Catálogos)";
  const ubicacionesValidas  = ubicaciones.map((u) => u.nombre).join(", ") || "(opcional — configura en Configuración → Ubicaciones)";
  const responsablesValidos = responsables.map((r) => r.nombre).join(", ") || "(opcional — configura en Configuración → Responsables)";
  const estadosValidos      = estados.map((e) => e.valor as string).join(", ");

  const refData: string[][] = [
    ["COLUMNA", "REQUERIDO", "INSTRUCCIÓN", "VALORES VÁLIDOS"],
    ["nombre",                       "SÍ",  "Nombre del permiso.",                                                                    ""],
    ["tipo",                         "SÍ",  "Debe coincidir exactamente (sin importar mayúsculas) con un tipo configurado.",           tiposValidos],
    ["numero_expediente",            "No",  "Número asignado por la entidad (ej: SNT-0001).",                                          ""],
    ["entidad_reguladora",           "No",  "Debe coincidir exactamente con una entidad configurada. Si no coincide, la fila falla.",  entidadesValidas],
    ["ubicacion",                    "No",  "Debe coincidir exactamente con una ubicación configurada. Si no coincide, la fila falla.", ubicacionesValidas],
    ["descripcion",                  "No",  "Notas o descripción adicional.",                                                          ""],
    ["fecha_solicitud",              "No",  "Formato: DD/MM/AAAA",                                                                     ""],
    ["fecha_emision",                "No",  "Formato: DD/MM/AAAA",                                                                     ""],
    ["fecha_vencimiento",            "No",  "Formato: DD/MM/AAAA",                                                                     ""],
    ["responsable_nombre",           "No",  "Debe coincidir con el nombre o correo de un responsable configurado.",                   responsablesValidos],
    ["estado",                       "No",  `Si se omite, se asigna "Creado" por defecto.`,                                           estadosValidos],
    ["valor_tramite",                "No",  "Monto numérico (ej: 1500.00).",                                                           ""],
    ["moneda",                       "No",  "Código de 3 letras (ej: USD, EUR). Por defecto USD.",                                     ""],
    ["base_legal",                   "No",  "Fundamento legal del permiso.",                                                           ""],
    ["riesgo_incumplimiento",        "No",  "Consecuencias de no cumplir con el permiso.",                                             ""],
    ["base_legal_incumplimiento",    "No",  "Base legal asociada al riesgo de incumplimiento.",                                        ""],
    ["tiene_provisional",            "No",  `"Sí" o "No". Indica si el permiso tiene una autorización provisional.`,                  "Sí, No"],
    ["fecha_emision_provisional",    "No",  "Formato: DD/MM/AAAA. Solo aplica si tiene_provisional es Sí.",                            ""],
    ["fecha_vencimiento_provisional","No",  "Formato: DD/MM/AAAA. Solo aplica si tiene_provisional es Sí.",                            ""],
  ];
  const wsRef = XLSX.utils.aoa_to_sheet(refData);
  wsRef["!cols"] = [{ wch: 30 }, { wch: 12 }, { wch: 55 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsRef, "Instrucciones");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla_permisos.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
