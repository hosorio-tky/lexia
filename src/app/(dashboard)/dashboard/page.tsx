import Link from "next/link";
import {
  AlertTriangle, Bell, ClipboardCheck, FileText,
  ShieldCheck, ArrowRight,
} from "lucide-react";
import AppShell from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatCard } from "@/components/dashboard/stat-card";
import { PermitStatusChart } from "@/components/dashboard/permit-status-chart";
import { ExpiryList } from "@/components/dashboard/expiry-list";
import { TasksPriorityBars, UrgentTasksList } from "@/components/dashboard/tasks-panel";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { createAdminClient } from "@/lib/supabase/admin";
import { createDashboardRepository } from "@/lib/repositories/dashboard";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createDashboardRepository(client, session.tenant_id);
  const stats   = await repo.getStats(session.user_id);

  const { permisos, tareas, notificaciones, actividad } = stats;

  // Acento de la card de alertas según gravedad
  const alertaAccent =
    permisos.vencidos > 0
      ? "danger"
      : permisos.proximos30 > 0
      ? "warning"
      : "default";

  const tareasAccent =
    tareas.urgentesAltas > 0 ? "warning" : "default";

  return (
    <AppShell
      breadcrumb="Inicio › Dashboard"
      user={{
        id:              session.user_id,
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
      }}
    >
      <div className="flex flex-col gap-6">

        {/* ── Saludo ─────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Buen día, {session.nombre} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aquí tienes el resumen de cumplimiento legal de tu empresa.
          </p>
        </div>

        {/* ── KPI Cards ──────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Permisos activos"
            value={permisos.activos}
            description={`${permisos.total} en total`}
            icon={<ShieldCheck className="h-5 w-5" />}
            accent="success"
            href="/permisos"
          />
          <StatCard
            title="Alertas"
            value={permisos.vencidos + permisos.proximos30}
            description={
              permisos.vencidos > 0
                ? `${permisos.vencidos} vencido${permisos.vencidos > 1 ? "s" : ""} · ${permisos.proximos30} por vencer`
                : permisos.proximos30 > 0
                ? `${permisos.proximos30} vence${permisos.proximos30 > 1 ? "n" : ""} en <30 días`
                : "Sin alertas críticas"
            }
            icon={<AlertTriangle className="h-5 w-5" />}
            accent={alertaAccent}
            href="/permisos"
          />
          <StatCard
            title="Tareas activas"
            value={tareas.pendientes + tareas.enProgreso}
            description={
              tareas.urgentesAltas > 0
                ? `${tareas.urgentesAltas} urgente${tareas.urgentesAltas > 1 ? "s" : ""} / alta prioridad`
                : `${tareas.pendientes} pendientes · ${tareas.enProgreso} en progreso`
            }
            icon={<ClipboardCheck className="h-5 w-5" />}
            accent={tareasAccent}
            href="/tareas"
          />
          <StatCard
            title="Notificaciones"
            value={notificaciones.sinLeer}
            description="sin leer"
            icon={<Bell className="h-5 w-5" />}
            accent={notificaciones.sinLeer > 0 ? "info" : "default"}
            href="/notificaciones"
          />
        </div>

        {/* ── Fila central ───────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-5">

          {/* Estado de permisos — recharts */}
          <Card className="lg:col-span-3 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Permisos por estado</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {permisos.total} permiso{permisos.total !== 1 ? "s" : ""} en total
                </p>
              </div>
              <Link
                href="/permisos"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
              >
                Ver todos <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <PermitStatusChart data={permisos.porEstado} />
          </Card>

          {/* Tareas por prioridad */}
          <Card className="lg:col-span-2 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Tareas por prioridad</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {tareas.total} tarea{tareas.total !== 1 ? "s" : ""} activas
                </p>
              </div>
              <Link
                href="/tareas"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
              >
                Ver todas <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <TasksPriorityBars
              data={tareas.porPrioridad}
              total={tareas.total}
            />

            {/* Mini stats de estado */}
            <Separator className="my-4" />
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Pendientes",  value: tareas.pendientes,  color: "text-slate-600" },
                { label: "En progreso", value: tareas.enProgreso,  color: "text-blue-600" },
                { label: "Completadas", value: tareas.completadas, color: "text-emerald-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg bg-muted/40 px-2 py-2">
                  <p className={`text-lg font-bold leading-none ${color}`}>{value}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Fila inferior ──────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-5">

          {/* Vencimientos próximos */}
          <Card className="lg:col-span-3 p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Vencimientos próximos</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Próximos 90 días
                </p>
              </div>
              <Link
                href="/permisos"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
              >
                Ver todos <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <ExpiryList items={permisos.proximosVencimientos} />
          </Card>

          {/* Tareas urgentes */}
          <Card className="lg:col-span-2 p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Tareas prioritarias</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Urgente y alta prioridad
                </p>
              </div>
              <Link
                href="/tareas"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
              >
                Ver todas <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <UrgentTasksList tasks={tareas.urgentes} />
          </Card>
        </div>

        {/* ── Actividad reciente ─────────────────────────────── */}
        {actividad.length > 0 && (
          <Card className="p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">Actividad reciente</h2>
            <ActivityFeed items={actividad} />
          </Card>
        )}

      </div>
    </AppShell>
  );
}
