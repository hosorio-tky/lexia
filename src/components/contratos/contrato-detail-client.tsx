"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, Calendar, ChevronDown, ChevronUp, Edit, RefreshCw, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ContratoStatusBadge } from "./contrato-status-badge";
import { ContratoVersionHistory } from "./contrato-version-history";
import { ContratoWorkflowModal } from "./contrato-workflow-modal";
import { RelatedTasksWidget } from "@/components/shared/related-tasks-widget";
import { ComentariosPanel } from "@/components/shared/comentarios-panel";
import { NotasPanel } from "@/components/shared/notas-panel";
import { AuditLogPanel } from "@/components/shared/audit-log-panel";
import { RichTextView } from "@/components/shared/rich-text-editor";
import { cambiarEstadoContrato, eliminarContrato } from "@/app/actions/contratos";
import {
  CONTRACT_ESTADOS,
  calcularProgresoTemporal,
  diasRestantes,
  type Contrato,
  type ContratoEstado,
  type ContratoVersion,
} from "@/types/contratos";
import type { UserProfile } from "@/types/users";
import type { Task } from "@/types/tasks";
import type { Comentario } from "@/lib/repositories/comentarios";
import type { Nota } from "@/lib/repositories/notas";
import type { ActividadEntry } from "@/lib/repositories/actividad";

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value ?? "—"}</span>
    </div>
  );
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-SV", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function formatValor(valor?: number, moneda?: string): string {
  if (valor == null) return "—";
  return `${moneda ?? "USD"} ${valor.toLocaleString("es-SV", { minimumFractionDigits: 2 })}`;
}

function Section({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="overflow-hidden shadow-sm">
        <CollapsibleTrigger className="flex w-full items-center justify-between px-5 py-4 hover:bg-muted/30 transition">
          <h2 className="text-sm font-semibold">{title}</h2>
          {open
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Separator />
          <div className="px-5 py-4">{children}</div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function ProgresoTemporal({ contrato }: { contrato: Contrato }) {
  const progreso = calcularProgresoTemporal(contrato.fecha_inicio, contrato.fecha_fin);
  const dias     = diasRestantes(contrato.fecha_fin);

  const colorClass =
    progreso > 75 ? "bg-red-500" :
    progreso > 50 ? "bg-amber-500" :
    "bg-emerald-500";

  return (
    <Card className="px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="text-sm font-medium">Plazo del contrato</span>
        <span className="text-sm text-muted-foreground">
          {progreso}% del plazo transcurrido
          {dias != null && ` · ${dias < 0 ? `Vencido hace ${Math.abs(dias)} días` : `${dias} días restantes`}`}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${progreso}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between px-0.5 text-[10px] text-muted-foreground">
        <span>{formatDate(contrato.fecha_inicio)}</span>
        <span>{formatDate(contrato.fecha_fin)}</span>
      </div>
    </Card>
  );
}

// Estados del flujo lineal para la barra (sin Cancelado/Vencido que son terminales laterales)
const FLUJO_LINEAL: ContratoEstado[] = ["En Revisión", "Pendiente Firma", "Vigente", "Terminado"];

function workflowProgress(estado: ContratoEstado): number {
  const idx = FLUJO_LINEAL.indexOf(estado);
  if (idx === -1) return 100; // estados terminales = 100%
  return Math.round(((idx + 1) / FLUJO_LINEAL.length) * 100);
}

export function ContratoDetailClient({
  contrato:           initialContrato,
  versiones,
  comentarios:        initialComentarios,
  notas:              initialNotas,
  actividad,
  tareas  = [],
  usuarios = [],
  userId = "",
}: {
  contrato:    Contrato;
  versiones:   ContratoVersion[];
  comentarios: Comentario[];
  notas:       Nota[];
  actividad:   ActividadEntry[];
  tareas?:     Task[];
  usuarios?:   UserProfile[];
  userId?:     string;
}) {
  const [contrato, setContrato]         = useState(initialContrato);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [isPending, startTransition]    = useTransition();

  const handleWorkflowConfirm = (nuevoEstado: ContratoEstado, _comment: string) => {
    setContrato((c) => ({ ...c, estado: nuevoEstado }));
    startTransition(() => cambiarEstadoContrato(contrato.id, nuevoEstado));
  };

  const handleEliminar = () => {
    if (!confirm("¿Eliminar este contrato? Esta acción es irreversible.")) return;
    startTransition(() => eliminarContrato(contrato.id));
  };

  const progress        = workflowProgress(contrato.estado);
  const tieneProgreso   = !!(contrato.fecha_inicio && contrato.fecha_fin);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/contratos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a la lista
      </Link>

      {/* Barra de flujo de estados */}
      <Card className="px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <ContratoStatusBadge estado={contrato.estado} />
            {contrato.numero && (
              <span className="font-mono text-xs text-muted-foreground">{contrato.numero}</span>
            )}
          </div>
          <span className="text-sm text-muted-foreground">{progress}% del flujo</span>
        </div>
        <Progress value={progress} className="mt-3 h-2" />
        <div className="mt-2 flex justify-between px-0.5 text-[10px] text-muted-foreground">
          {FLUJO_LINEAL.map((e) => <span key={e}>{e}</span>)}
        </div>
      </Card>

      {/* Barra de progreso temporal */}
      {tieneProgreso && <ProgresoTemporal contrato={contrato} />}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Info general */}
          <Section title="Información General">
            <div className="space-y-3">
              <InfoRow label="Título"      value={contrato.titulo} />
              <InfoRow label="Número"      value={contrato.numero} />
              <InfoRow label="Tipo"        value={contrato.tipo} />
              <InfoRow label="Responsable" value={contrato.responsable_nombre} />
              {contrato.valor != null && (
                <InfoRow label="Valor" value={formatValor(contrato.valor, contrato.moneda)} />
              )}
              {contrato.descripcion && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Descripción</p>
                  <p className="text-sm whitespace-pre-wrap">{contrato.descripcion}</p>
                </div>
              )}
            </div>
          </Section>

          {/* Fechas */}
          <Section title="Fechas Clave">
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: "Inicio",  date: contrato.fecha_inicio, color: "text-muted-foreground" },
                { label: "Firma",   date: contrato.fecha_firma,  color: "text-emerald-600" },
                { label: "Fin",     date: contrato.fecha_fin,    color: "text-amber-600" },
              ].map(({ label, date, color }) => (
                <div key={label} className="rounded-lg border bg-muted/20 p-3 text-center">
                  <Calendar className={`mx-auto mb-1 h-4 w-4 ${color}`} />
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="mt-1 text-sm font-semibold">{formatDate(date)}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* Documento */}
          <Section title="Documento" defaultOpen={!!(contrato.storage_path || contrato.contenido_html)}>
            {contrato.storage_path ? (
              <div className="space-y-3">
                <iframe
                  src={`/api/contratos/file?path=${encodeURIComponent(contrato.storage_path)}`}
                  className="h-[600px] w-full rounded-lg border"
                  title="Visor PDF del contrato"
                />
                <a
                  href={`/api/contratos/file?path=${encodeURIComponent(contrato.storage_path)}&download=1`}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  download
                >
                  Descargar PDF
                </a>
              </div>
            ) : contrato.contenido_html ? (
              <div className="rounded-lg border bg-muted/10 p-4">
                <RichTextView html={contrato.contenido_html} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Sin documento adjunto ni contenido HTML. Edita el contrato para agregar contenido.
              </p>
            )}
          </Section>

          {/* Versiones */}
          <Section title={`Versiones del contenido${versiones.length > 0 ? ` (${versiones.length})` : ""}`} defaultOpen={false}>
            <ContratoVersionHistory versiones={versiones} />
          </Section>

          {/* Tareas vinculadas */}
          <Section title={`Tareas vinculadas${tareas.length > 0 ? ` (${tareas.length})` : ""}`} defaultOpen={tareas.length > 0}>
            <RelatedTasksWidget
              modulo="contratos"
              recursoId={contrato.id}
              recursoDesc={contrato.titulo}
              initialTasks={tareas}
              usuarios={usuarios}
            />
          </Section>

          {/* Comentarios */}
          <Section title="Comentarios" defaultOpen={false}>
            <ComentariosPanel
              modulo="contratos"
              recursoId={contrato.id}
              userId={userId}
              initialComentarios={initialComentarios}
              users={usuarios.map((u) => ({
                id:        u.id,
                label:     u.nombre_completo || u.nombre,
                iniciales: u.iniciales,
              }))}
            />
          </Section>

          {/* Notas y Documentos */}
          <Section
            title={`Notas y Documentos${initialNotas.length > 0 ? ` (${initialNotas.length})` : ""}`}
            defaultOpen={false}
          >
            <NotasPanel
              modulo="contratos"
              recursoId={contrato.id}
              initialNotas={initialNotas}
              users={usuarios.map((u) => ({
                id:        u.id,
                label:     u.nombre_completo || u.nombre,
                iniciales: u.iniciales,
              }))}
            />
          </Section>

          {/* Historial de cambios */}
          <Section title={`Historial de cambios${actividad.length > 0 ? ` (${actividad.length})` : ""}`} defaultOpen={false}>
            <AuditLogPanel entries={actividad} />
          </Section>
        </div>

        {/* Columna lateral */}
        <div className="flex flex-col gap-5">

          {/* Responsable y Contraparte */}
          <Section title="Responsable y Contraparte">
            <div className="space-y-4">
              {contrato.responsable_nombre ? (
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {contrato.responsable_nombre.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{contrato.responsable_nombre}</div>
                    <div className="text-xs text-muted-foreground">Responsable</div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Sin responsable asignado.</p>
              )}
              {(contrato.contraparte_nombre || contrato.contraparte_email) && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Contraparte</p>
                    {contrato.contraparte_nombre && (
                      <p className="text-sm font-medium">{contrato.contraparte_nombre}</p>
                    )}
                    {contrato.contraparte_email && (
                      <a
                        href={`mailto:${contrato.contraparte_email}`}
                        className="text-xs text-primary hover:underline"
                      >
                        {contrato.contraparte_email}
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          </Section>

          {/* Flujo de trabajo */}
          <Card className="p-4 shadow-sm border-primary/20 bg-primary/5">
            <h3 className="text-sm font-semibold mb-1">Flujo de trabajo</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Estado actual: <strong className="text-foreground">{contrato.estado}</strong>
            </p>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full"
                onClick={() => setWorkflowOpen(true)}
                disabled={isPending}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Cambiar estado
              </Button>
              <Link href={`/contratos/${contrato.id}/editar`}>
                <Button variant="outline" className="w-full">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar contrato
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={handleEliminar}
                disabled={isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            </div>
          </Card>

          {/* Resumen económico */}
          {(contrato.valor != null || contrato.fecha_fin) && (
            <Card className="p-4 shadow-sm">
              <h3 className="text-sm font-semibold mb-3">Resumen</h3>
              <div className="space-y-2">
                {contrato.valor != null && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Valor</span>
                    <span className="font-medium">{formatValor(contrato.valor, contrato.moneda)}</span>
                  </div>
                )}
                {contrato.fecha_fin && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Vence</span>
                    <span className="font-medium">{formatDate(contrato.fecha_fin)}</span>
                  </div>
                )}
                {contrato.fecha_firma && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Firmado</span>
                    <span className="font-medium">{formatDate(contrato.fecha_firma)}</span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      <ContratoWorkflowModal
        open={workflowOpen}
        onOpenChange={setWorkflowOpen}
        currentEstado={contrato.estado}
        titulo={contrato.titulo}
        onConfirm={handleWorkflowConfirm}
      />
    </div>
  );
}
