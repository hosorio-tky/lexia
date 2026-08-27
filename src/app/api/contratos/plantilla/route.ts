import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createConfiguracionRepository } from "@/lib/repositories/configuracion";
import { createResponsablesRepository } from "@/lib/repositories/responsables";
import { MONEDAS_CONTRATO } from "@/types/contratos";

export async function GET() {
  const session = await getSession();
  const client  = createAdminClient();

  async function fetchEstadosContrato(): Promise<{ valor: string }[]> {
    try {
      const { data } = await client.from("workflow_estados").select("valor").eq("modulo", "contratos").order("orden");
      return (data ?? []) as { valor: string }[];
    } catch {
      return [];
    }
  }

  const [tipos, responsables, estados] = await Promise.all([
    // "tipo" es el campo de catálogo que realmente usan crear/editar/listar
    // contratos hoy (no "tipo_contrato" — ver nota en importar-contratos.ts).
    createConfiguracionRepository(client, session.tenant_id).getCatalogos("contratos", "tipo").catch(() => []),
    createResponsablesRepository(client, session.tenant_id).list().catch(() => []),
    fetchEstadosContrato(),
  ]);

  const wb = XLSX.utils.book_new();

  // ── Hoja principal: Datos ─────────────────────────────────
  const headers = [
    "titulo",
    "tipo",
    "numero",
    "descripcion",
    "contraparte_nombre",
    "contraparte_email",
    "valor",
    "moneda",
    "fecha_inicio",
    "fecha_firma",
    "fecha_fin",
    "responsable_nombre",
    "estado",
  ];

  // Solo headers + datos de ejemplo. Sin fila de instrucciones aparte
  // para que el parsing sea directo: fila 1 = headers, fila 2+ = datos.
  const ejemplo = [
    "Contrato de Servicios de Consultoría en Tecnología",
    tipos[0]?.valor ?? "Servicios",
    "CONT-2026-0001",
    "Consultoría técnica para migración de infraestructura",
    "Consultora Andina S.A.",
    "contacto@consultora-andina.com",
    "15000.00",
    "USD",
    "01/01/2026",
    "01/01/2026",
    "31/12/2026",
    responsables[0]?.nombre ?? "Ana García",
    "En Revisión",
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo]);

  // Anchos de columna
  ws["!cols"] = [
    { wch: 45 }, // titulo
    { wch: 16 }, // tipo
    { wch: 18 }, // numero
    { wch: 40 }, // descripcion
    { wch: 28 }, // contraparte_nombre
    { wch: 28 }, // contraparte_email
    { wch: 14 }, // valor
    { wch: 10 }, // moneda
    { wch: 16 }, // fecha_inicio
    { wch: 16 }, // fecha_firma
    { wch: 16 }, // fecha_fin
    { wch: 25 }, // responsable_nombre
    { wch: 18 }, // estado
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Contratos");

  // ── Hoja de referencia: Instrucciones + Valores válidos ──
  // Los valores válidos se generan a partir de la configuración real del
  // tenant (catálogos, responsables, estados) para que la plantilla nunca
  // quede desactualizada respecto al sistema.
  const tiposValidos        = tipos.map((c) => c.valor).join(", ") || "(configura tipos en Configuración → Catálogos)";
  const responsablesValidos = responsables.map((r) => r.nombre).join(", ") || "(opcional — configura en Configuración → Responsables)";
  const estadosValidos      = estados.map((e) => e.valor).join(", ");
  const monedasValidas      = MONEDAS_CONTRATO.join(", ");

  const refData: string[][] = [
    ["COLUMNA", "REQUERIDO", "INSTRUCCIÓN", "VALORES VÁLIDOS"],
    ["titulo",              "SÍ",  "Título del contrato.",                                                                    ""],
    ["tipo",                "SÍ",  "Debe coincidir exactamente (sin importar mayúsculas) con un tipo configurado.",           tiposValidos],
    ["numero",              "No",  "Número o referencia interna (ej: CONT-2026-0001).",                                      ""],
    ["descripcion",         "No",  "Notas o descripción adicional.",                                                         ""],
    ["contraparte_nombre",  "No",  "Nombre de la contraparte (empresa o persona).",                                          ""],
    ["contraparte_email",   "No",  "Correo de contacto de la contraparte.",                                                  ""],
    ["valor",               "No",  "Monto del contrato (ej: 15000.00).",                                                     ""],
    ["moneda",              "No",  "Código de moneda. Por defecto USD.",                                                     monedasValidas],
    ["fecha_inicio",        "No",  "Formato: DD/MM/AAAA",                                                                    ""],
    ["fecha_firma",         "No",  "Formato: DD/MM/AAAA",                                                                    ""],
    ["fecha_fin",           "No",  "Formato: DD/MM/AAAA",                                                                    ""],
    ["responsable_nombre",  "No",  "Debe coincidir con el nombre o correo de un responsable configurado.",                  responsablesValidos],
    ["estado",              "No",  `Si se omite, se asigna "En Revisión" por defecto.`,                                     estadosValidos],
  ];
  const wsRef = XLSX.utils.aoa_to_sheet(refData);
  wsRef["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 55 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsRef, "Instrucciones");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla_contratos.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
