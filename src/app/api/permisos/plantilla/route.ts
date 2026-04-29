import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { PERMIT_TYPES, PERMIT_STATUSES } from "@/types/permits";

export async function GET() {
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
  ];

  // Solo headers + datos de ejemplo. Sin fila de instrucciones
  // para que el parsing sea directo: fila 1 = headers, fila 2+ = datos.
  const ejemplo = [
    "Registro Sanitario Planta Norte",
    "Sanitario",
    "SNT-0099",
    "MINSAL",
    "Planta Norte",
    "Registro sanitario para línea de producción",
    "01/01/2025",
    "15/03/2025",
    "15/03/2026",
    "Ana García",
    "Aprobado",
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
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Permisos");

  // ── Hoja de referencia: Instrucciones + Valores válidos ──
  const refData: string[][] = [
    ["COLUMNA", "REQUERIDO", "INSTRUCCIÓN", "VALORES VÁLIDOS"],
    ["nombre",            "SÍ",  "Nombre del permiso.",                              ""],
    ["tipo",              "SÍ",  "Debe ser exactamente uno de los valores válidos.",  PERMIT_TYPES.join(", ")],
    ["numero_expediente", "No",  "Número asignado por la entidad (ej: SNT-0001).",    ""],
    ["entidad_reguladora","No",  "Entidad que emite el permiso (ej: MARN, MINSAL).",  ""],
    ["ubicacion",         "No",  "Planta o ubicación a la que aplica.",               ""],
    ["descripcion",       "No",  "Notas o descripción adicional.",                    ""],
    ["fecha_solicitud",   "No",  "Formato: DD/MM/AAAA",                              ""],
    ["fecha_emision",     "No",  "Formato: DD/MM/AAAA",                              ""],
    ["fecha_vencimiento", "No",  "Formato: DD/MM/AAAA",                              ""],
    ["responsable_nombre","No",  "Nombre completo del responsable.",                  ""],
    ["estado",            "No",  `Si se omite, se asigna "Creado" por defecto.`,     PERMIT_STATUSES.join(", ")],
  ];
  const wsRef = XLSX.utils.aoa_to_sheet(refData);
  wsRef["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 48 }, { wch: 60 }];
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
