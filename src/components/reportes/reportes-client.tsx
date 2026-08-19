"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle, ChevronDown, ChevronRight, Download, FileText,
  Loader2, Search, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { descargarExcel } from "@/lib/export-excel";
import {
  reportePermisosPorVencer,
  reportePermisosPorEstado,
  reporteContratosPorVencer,
  reporteContratosPorContraparte,
  reporteTareasProblematicas,
  reporteActividadPorResponsable,
  type FilaReporte,
} from "@/app/actions/reportes";

// ─── Definición de plantillas ─────────────────────────────────────────────────
type ParamType = { key: string; label: string; type: "number"; default: number };

interface Plantilla {
  id: string;
  titulo: string;
  descripcion: string;
  icon: React.ElementType;
  iconClass: string;
  params?: ParamType[];
  run: (params: Record<string, number>) => Promise<FilaReporte[]>;
  filename: string;
}

const PLANTILLAS: Plantilla[] = [
  {
    id: "permisos-por-vencer",
    titulo: "Permisos por vencer",
    descripcion: "Lista todos los permisos cuya fecha de vencimiento cae dentro del período indicado.",
    icon: AlertCircle,
    iconClass: "bg-amber-50 text-amber-600",
    params: [{ key: "dias", label: "Próximos N días", type: "number", default: 60 }],
    run: (p) => reportePermisosPorVencer(p.dias),
    filename: "permisos-por-vencer.xlsx",
  },
  {
    id: "permisos-por-estado",
    titulo: "Permisos por estado",
    descripcion: "Todos los permisos agrupados por estado actual del flujo de trabajo.",
    icon: FileText,
    iconClass: "bg-blue-50 text-blue-600",
    run: () => reportePermisosPorEstado(),
    filename: "permisos-por-estado.xlsx",
  },
  {
    id: "contratos-por-vencer",
    titulo: "Contratos por vencer",
    descripcion: "Contratos cuya fecha de término cae dentro del período indicado.",
    icon: AlertCircle,
    iconClass: "bg-orange-50 text-orange-600",
    params: [{ key: "dias", label: "Próximos N días", type: "number", default: 60 }],
    run: (p) => reporteContratosPorVencer(p.dias),
    filename: "contratos-por-vencer.xlsx",
  },
  {
    id: "contratos-por-contraparte",
    titulo: "Contratos por contraparte",
    descripcion: "Todos los contratos ordenados por contraparte, con valor y fechas.",
    icon: FileText,
    iconClass: "bg-violet-50 text-violet-600",
    run: () => reporteContratosPorContraparte(),
    filename: "contratos-por-contraparte.xlsx",
  },
  {
    id: "tareas-problematicas",
    titulo: "Tareas vencidas o sin asignar",
    descripcion: "Tareas activas que ya pasaron su fecha límite o que no tienen responsable.",
    icon: AlertCircle,
    iconClass: "bg-red-50 text-red-600",
    run: () => reporteTareasProblematicas(),
    filename: "tareas-problematicas.xlsx",
  },
  {
    id: "actividad-por-responsable",
    titulo: "Actividad por responsable",
    descripcion: "Cuántos permisos y contratos activos tiene asignados cada responsable.",
    icon: Users,
    iconClass: "bg-teal-50 text-teal-600",
    run: () => reporteActividadPorResponsable(),
    filename: "actividad-por-responsable.xlsx",
  },
];

// ─── Componente tabla de resultados ──────────────────────────────────────────
const PREVIEW_LIMIT = 200;

function TablaResultados({ filas, onExport, exporting }: {
  filas: FilaReporte[];
  onExport: () => void;
  exporting: boolean;
}) {
  const [busqueda, setBusqueda] = useState("");

  const columnas = filas.length > 0 ? Object.keys(filas[0]) : [];

  const filasFiltradas = busqueda.trim()
    ? filas.filter((f) =>
        Object.values(f).some((v) =>
          String(v ?? "").toLowerCase().includes(busqueda.toLowerCase())
        )
      )
    : filas;

  const filasVisibles  = filasFiltradas.slice(0, PREVIEW_LIMIT);
  const hayMas         = filasFiltradas.length > PREVIEW_LIMIT;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filtrar resultados…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {hayMas
              ? `Mostrando ${PREVIEW_LIMIT} de ${filasFiltradas.length}`
              : `${filasFiltradas.length} ${filasFiltradas.length === 1 ? "fila" : "filas"}`
            }
            {busqueda && !hayMas && ` de ${filas.length}`}
          </span>
          <Button size="sm" onClick={onExport} disabled={exporting || filas.length === 0}>
            {exporting
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Download className="mr-2 h-4 w-4" />
            }
            Exportar Excel
          </Button>
        </div>
      </div>

      {hayMas && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
          Se muestran los primeros {PREVIEW_LIMIT} registros. Exporta a Excel para ver el conjunto completo ({filasFiltradas.length} registros).
        </p>
      )}

      {filasFiltradas.length === 0 ? (
        <div className="rounded-lg border py-12 text-center text-sm text-muted-foreground">
          {busqueda ? "Sin resultados para ese filtro." : "No hay datos para los parámetros seleccionados."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                {columnas.map((col) => (
                  <th key={col} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filasVisibles.map((fila, i) => (
                <tr key={i} className={cn("border-b last:border-0", i % 2 === 1 && "bg-muted/20")}>
                  {columnas.map((col) => (
                    <td key={col} className="px-4 py-2.5 text-sm">
                      {fila[col] != null && fila[col] !== "" ? String(fila[col]) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Tarjeta de plantilla ─────────────────────────────────────────────────────
function PlantillaCard({ plantilla }: { plantilla: Plantilla }) {
  const [open,      setOpen]      = useState(false);
  const [filas,     setFilas]     = useState<FilaReporte[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const [exporting, setExporting] = useState(false);
  const [paramVals, setParamVals] = useState<Record<string, number>>(
    Object.fromEntries((plantilla.params ?? []).map((p) => [p.key, p.default]))
  );

  const Icon = plantilla.icon;

  function handleGenerar() {
    startTransition(async () => {
      const data = await plantilla.run(paramVals);
      setFilas(data);
    });
  }

  function handleExport() {
    if (!filas || filas.length === 0) return;
    setExporting(true);
    try {
      descargarExcel(filas, plantilla.filename);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <button
        type="button"
        className="flex w-full items-center gap-4 px-6 py-5 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", plantilla.iconClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{plantilla.titulo}</p>
          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">{plantilla.descripcion}</p>
        </div>
        <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
      </button>

      {/* Body */}
      {open && (
        <div className="border-t bg-muted/20 px-6 pb-6 pt-5 flex flex-col gap-5">
          {/* Parámetros */}
          {(plantilla.params ?? []).length > 0 && (
            <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-background px-4 py-4">
              {(plantilla.params ?? []).map((param) => (
                <div key={param.key} className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium">{param.label}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={paramVals[param.key]}
                    onChange={(e) =>
                      setParamVals((prev) => ({ ...prev, [param.key]: parseInt(e.target.value, 10) || 1 }))
                    }
                    className="h-9 w-32"
                  />
                </div>
              ))}
              <Button size="sm" onClick={handleGenerar} disabled={isPending} className="mb-0.5">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generar reporte
              </Button>
            </div>
          )}

          {/* Sin parámetros: botón directo */}
          {(plantilla.params ?? []).length === 0 && filas === null && (
            <div>
              <Button size="sm" onClick={handleGenerar} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generar reporte
              </Button>
            </div>
          )}

          {/* Sin parámetros + ya generado: mostrar botón regenerar arriba de tabla */}
          {(plantilla.params ?? []).length === 0 && filas !== null && (
            <div>
              <Button size="sm" variant="outline" onClick={handleGenerar} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Regenerar
              </Button>
            </div>
          )}

          {/* Tabla */}
          {isPending && filas === null && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generando reporte…
            </div>
          )}
          {filas !== null && !isPending && (
            <TablaResultados filas={filas} onExport={handleExport} exporting={exporting} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Export principal ─────────────────────────────────────────────────────────
export function ReportesClient() {
  return (
    <div className="flex flex-col gap-4">
      {PLANTILLAS.map((p) => (
        <PlantillaCard key={p.id} plantilla={p} />
      ))}
    </div>
  );
}
