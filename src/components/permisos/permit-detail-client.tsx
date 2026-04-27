"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, Calendar, ChevronDown, ChevronUp,
  Edit, MapPin, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { PermitStatusBadge, VigenciaBadge } from "./permit-status-badge";
import { PermitTimeline } from "./permit-timeline";
import { PermitWorkflowModal } from "./permit-workflow-modal";
import { cambiarEstado } from "@/app/actions/permisos";
import {
  PERMIT_STATUSES,
  calcularVigencia,
  type Permit,
  type PermitStatus,
  type TimelineEvent,
  type PermitFechaHistorial,
} from "@/types/permits";
import { TaskQuickCreate } from "@/components/tareas/task-quick-create";
import { RelatedTasksWidget } from "@/components/shared/related-tasks-widget";
import { ComentariosPanel } from "@/components/shared/comentarios-panel";
import { NotasPanel } from "@/components/shared/notas-panel";
import { AuditLogPanel } from "@/components/shared/audit-log-panel";
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

function workflowProgress(status: PermitStatus): number {
  const idx = PERMIT_STATUSES.indexOf(status);
  return Math.round(((idx + 1) / PERMIT_STATUSES.length) * 100);
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

export function PermitDetailClient({
  permit: initialPermit,
  timeline: initialTimeline,
  fechasHistorial: initialFechasHistorial = [],
  usuarios = [],
  tareas = [],
  comentarios = [],
  notas = [],
  actividad = [],
  userId = "",
}: {
  permit: Permit;
  timeline: TimelineEvent[];
  fechasHistorial?: PermitFechaHistorial[];
  usuarios?: UserProfile[];
  tareas?: Task[];
  comentarios?: Comentario[];
  notas?: Nota[];
  actividad?: ActividadEntry[];
  userId?: string;
}) {
  const [permit, setPermit]     = useState(initialPermit);
  const [timeline, setTimeline] = useState(initialTimeline);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [isPending, startTransition]    = useTransition();

  const handleWorkflowConfirm = (newStatus: PermitStatus, comment: string) => {
    // Actualización optimista
    const event: TimelineEvent = {
      id: `temp-${Date.now()}`,
      permit_id:         permit.id,
      estado_anterior:   permit.estado,
      estado_nuevo:      newStatus,
      comentario:        comment || undefined,
      changed_by_nombre: "Usuario Demo",
      created_at:        new Date().toISOString(),
    };
    setPermit((p) => ({ ...p, estado: newStatus }));
    setTimeline((t) => [...t, event]);

    // Persistir en BD
    startTransition(() => cambiarEstado(permit.id, newStatus, comment));
  };

  const progress = workflowProgress(permit.estado);
  const vigencia = calcularVigencia(permit.fecha_vencimiento);

  // Check if provisional is still active
  const provisionalVigente =
    permit.tiene_provisional &&
    (!permit.fecha_vencimiento_provisional ||
      new Date(permit.fecha_vencimiento_provisional).getTime() > Date.now());

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/permisos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a la lista
      </Link>

      {/* Barra de estado y progreso */}
      <Card className="px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <PermitStatusBadge status={permit.estado} />
            <VigenciaBadge status={vigencia} />
            {permit.numero_expediente && (
              <span className="font-mono text-xs text-muted-foreground">
                {permit.numero_expediente}
              </span>
            )}
          </div>
          <span className="text-sm text-muted-foreground">{progress}% del flujo</span>
        </div>
        <Progress value={progress} className="mt-3 h-2" />
        <div className="mt-2 flex justify-between px-0.5 text-[10px] text-muted-foreground">
          <span>Creado</span>
          <span>Presentado</span>
          <span>Aprobado</span>
          <span>Actualizar</span>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <Section title="Información General">
            <div className="space-y-3">
              <InfoRow label="Nombre"               value={permit.nombre} />
              <InfoRow label="Número de expediente" value={permit.numero_expediente} />
              <InfoRow label="Tipo"                 value={permit.tipo} />
              <InfoRow label="Entidad reguladora"   value={permit.entidad_reguladora} />
              {(permit.valor_tramite != null) && (
                <InfoRow
                  label="Valor del trámite"
                  value={`${permit.moneda ?? "USD"} ${permit.valor_tramite.toLocaleString("es-SV", { minimumFractionDigits: 2 })}`}
                />
              )}
              <InfoRow label="Descripción"          value={permit.descripcion} />
            </div>
          </Section>

          {(permit.base_legal || permit.riesgo_incumplimiento || permit.base_legal_incumplimiento) && (
            <Section title="Marco Legal y Riesgo" defaultOpen={false}>
              <div className="space-y-4">
                {permit.base_legal && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Base Legal del Permiso</p>
                    <p className="text-sm whitespace-pre-wrap">{permit.base_legal}</p>
                  </div>
                )}
                {permit.riesgo_incumplimiento && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Riesgo por Incumplimiento</p>
                    <p className="text-sm whitespace-pre-wrap">{permit.riesgo_incumplimiento}</p>
                  </div>
                )}
                {permit.base_legal_incumplimiento && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Base Legal del Incumplimiento</p>
                    <p className="text-sm whitespace-pre-wrap">{permit.base_legal_incumplimiento}</p>
                  </div>
                )}
              </div>
            </Section>
          )}

          <Section title="Fechas Clave">
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: "Solicitud",   date: permit.fecha_solicitud,   color: "text-muted-foreground" },
                { label: "Emisión",     date: permit.fecha_emision,     color: "text-emerald-600" },
                { label: "Vencimiento", date: permit.fecha_vencimiento, color: vigencia === "Vencido" ? "text-red-500" : vigencia === "Por vencer" ? "text-amber-500" : "text-muted-foreground" },
              ].map(({ label, date, color }) => (
                <div key={label} className="rounded-lg border bg-muted/20 p-3 text-center">
                  <Calendar className={`mx-auto mb-1 h-4 w-4 ${color}`} />
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="mt-1 text-sm font-semibold">{formatDate(date)}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* Permiso Provisional */}
          {permit.tiene_provisional && (
            <Section title="Permiso Provisional">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Estado vigencia provisional:</span>
                  <VigenciaBadge status={calcularVigencia(permit.fecha_vencimiento_provisional)} />
                  {provisionalVigente && (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold border border-amber-300">
                      P
                    </span>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border bg-muted/20 p-3 text-center">
                    <Calendar className="mx-auto mb-1 h-4 w-4 text-amber-600" />
                    <div className="text-xs text-muted-foreground">Emisión provisional</div>
                    <div className="mt-1 text-sm font-semibold">{formatDate(permit.fecha_emision_provisional)}</div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3 text-center">
                    <Calendar className="mx-auto mb-1 h-4 w-4 text-orange-600" />
                    <div className="text-xs text-muted-foreground">Vencimiento provisional</div>
                    <div className="mt-1 text-sm font-semibold">{formatDate(permit.fecha_vencimiento_provisional)}</div>
                  </div>
                </div>
              </div>
            </Section>
          )}

          <Section title="Cronología del Trámite">
            <PermitTimeline events={timeline} />
          </Section>

          {/* Historial de fechas */}
          {initialFechasHistorial.length > 0 && (
            <Section title={`Historial de fechas (${initialFechasHistorial.length})`} defaultOpen={false}>
              <div className="space-y-3">
                {initialFechasHistorial.map((entry) => (
                  <div key={entry.id} className="rounded-lg border bg-muted/20 px-4 py-3 text-sm space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {entry.changed_by_nombre ?? "Usuario"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.changed_at).toLocaleDateString("es-SV", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </span>
                    </div>
                    {entry.fecha_emision_anterior && (
                      <div className="text-muted-foreground">
                        Emisión anterior: <span className="font-medium text-foreground">{formatDate(entry.fecha_emision_anterior)}</span>
                      </div>
                    )}
                    {entry.fecha_vencimiento_anterior && (
                      <div className="text-muted-foreground">
                        Vencimiento anterior: <span className="font-medium text-foreground">{formatDate(entry.fecha_vencimiento_anterior)}</span>
                      </div>
                    )}
                    {entry.motivo && (
                      <div className="text-muted-foreground text-xs italic">{entry.motivo}</div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* SC-04 — Tareas relacionadas */}
          <Section title={`Tareas vinculadas${tareas.length > 0 ? ` (${tareas.length})` : ""}`} defaultOpen={tareas.length > 0}>
            <RelatedTasksWidget
              modulo="permisos"
              recursoId={permit.id}
              recursoDesc={permit.nombre}
              initialTasks={tareas}
              usuarios={usuarios}
            />
          </Section>

          {/* SC-01 — Comentarios */}
          <Section title="Comentarios" defaultOpen={false}>
            <ComentariosPanel
              modulo="permisos"
              recursoId={permit.id}
              userId={userId}
              initialComentarios={comentarios}
              users={usuarios.map((u) => ({
                id:       u.id,
                label:    u.nombre_completo || u.nombre,
                iniciales: u.iniciales,
              }))}
            />
          </Section>

          {/* SC-02 — Notas y Documentos */}
          <Section title={`Notas y Documentos${notas.length > 0 ? ` (${notas.length})` : ""}`} defaultOpen={false}>
            <NotasPanel
              modulo="permisos"
              recursoId={permit.id}
              initialNotas={notas}
              users={usuarios.map((u) => ({
                id:       u.id,
                label:    u.nombre_completo || u.nombre,
                iniciales: u.iniciales,
              }))}
            />
          </Section>

          {/* SC-03 — Historial de cambios */}
          <Section title={`Historial de cambios${actividad.length > 0 ? ` (${actividad.length})` : ""}`} defaultOpen={false}>
            <AuditLogPanel entries={actividad} />
          </Section>
        </div>

        {/* Columna lateral */}
        <div className="flex flex-col gap-5">
          <Section title="Responsable y Ubicación">
            <div className="space-y-4">
              {permit.responsable_nombre && (
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {permit.responsable_iniciales}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{permit.responsable_nombre}</div>
                    <div className="text-xs text-muted-foreground">Responsable</div>
                  </div>
                </div>
              )}
              {permit.ubicacion && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {permit.ubicacion}
                </div>
              )}
            </div>
          </Section>

          {/* Panel de acciones */}
          <Card className="p-4 shadow-sm border-primary/20 bg-primary/5">
            <h3 className="text-sm font-semibold mb-1">Flujo de trabajo</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Estado actual: <strong className="text-foreground">{permit.estado}</strong>
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
              <TaskQuickCreate
                modulo="permisos"
                recursoId={permit.id}
                recursoDesc={permit.nombre}
                usuarios={usuarios}
                variant="outline"
                size="sm"
              />
              <Link href={`/permisos/${permit.id}/editar`}>
                <Button variant="outline" className="w-full">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar permiso
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <PermitWorkflowModal
        open={workflowOpen}
        onOpenChange={setWorkflowOpen}
        currentStatus={permit.estado}
        permitName={permit.nombre}
        onConfirm={handleWorkflowConfirm}
      />
    </div>
  );
}
