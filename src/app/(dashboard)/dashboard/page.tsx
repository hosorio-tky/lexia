import Link from "next/link";
import {
  AlertTriangle, ClipboardCheck, FileText, ShieldCheck, ArrowRight,
} from "lucide-react";
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
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createDashboardRepository(client, session.tenant_id);

  const [stats, tenantRow] = await Promise.all([
    repo.getStats(session.user_id),
    session.rol === "admin"
      ? client.from("tenants").select("onboarding_steps, onboarding_dismissed_at").eq("id", session.tenant_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const showOnboarding =
    session.rol === "admin" &&
    tenantRow.data &&
    !tenantRow.data.onboarding_dismissed_at;

  const onboardingSteps =
    (tenantRow.data?.onboarding_steps as Record<string, boolean>) ?? {};

  const { permisos, contratos, tareas, actividad } = stats;

  const proximosVencimientos = [
    ...permisos.proximosVencimientos,
    ...contratos.proximosVencimientos,
  ].sort((a, b) => a.diasRestantes - b.diasRestantes).slice(0, 7);

  const permisosAlertas   = permisos.vencidos + permisos.proximos30;
  const contratosAlertas  = contratos.porVencer30;
  const alertaTotal       = permisosAlertas + contratosAlertas;

  const alertaBorder =
    permisos.vencidos > 0
      ? "border-red-200 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20"
      : alertaTotal > 0
      ? "border-orange-200 bg-orange-50/40 dark:border-orange-900/40 dark:bg-orange-950/20"
      : "border-border";
  const alertaIconCls =
    permisos.vencidos > 0
      ? "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400"
      : alertaTotal > 0
      ? "bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400"
      : "bg-muted text-muted-foreground";
  const alertaValueCls =
    permisos.vencidos > 0 ? "text-red-700 dark:text-red-400"
    : alertaTotal > 0     ? "text-orange-700 dark:text-orange-400"
    : "text-foreground";

  const tareasAccent =
    tareas.urgentesAltas > 0 ? "warning" : "default";

  return (
          <div className="flex flex-col gap-6">

        {/* ── Onboarding ─────────────────────────────────────── */}
        {showOnboarding && (
          <OnboardingChecklist initialSteps={onboardingSteps} />
        )}

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

          {/* 1. Permisos vigentes */}
          <StatCard
            title="Permisos vigentes"
            value={permisos.activos}
            description={
              permisos.proximos30 > 0
                ? `${permisos.proximos30} vence${permisos.proximos30 > 1 ? "n" : ""} en <30 días`
                : "Sin vencimientos próximos"
            }
            icon={<ShieldCheck className="h-5 w-5" />}
            accent={permisos.proximos30 > 0 ? "warning" : "success"}
            href="/permisos"
          />

          {/* 2. Contratos vigentes */}
          <StatCard
            title="Contratos vigentes"
            value={contratos.vigentes}
            description={
              contratos.porVencer30 > 0
                ? `${contratos.porVencer30} vence${contratos.porVencer30 > 1 ? "n" : ""} en <30 días`
                : "Sin vencimientos próximos"
            }
            icon={<FileText className="h-5 w-5" />}
            accent={contratos.porVencer30 > 0 ? "warning" : "success"}
            href="/contratos"
          />

          {/* 3. Alertas — split permisos / contratos */}
          <Card className={`flex items-start gap-4 p-5 shadow-sm ${alertaBorder}`}>
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${alertaIconCls}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Alertas
              </p>
              <p className={`mt-0.5 text-3xl font-bold leading-none tracking-tight ${alertaValueCls}`}>
                {alertaTotal}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Link
                  href="/permisos"
                  className="flex items-center gap-0.5 hover:text-foreground transition-colors"
                >
                  <span className={permisosAlertas > 0 ? "font-semibold text-foreground" : ""}>{permisosAlertas}</span>
                  <span>permisos</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
                <span className="text-muted-foreground/40">·</span>
                <Link
                  href="/contratos"
                  className="flex items-center gap-0.5 hover:text-foreground transition-colors"
                >
                  <span className={contratosAlertas > 0 ? "font-semibold text-foreground" : ""}>{contratosAlertas}</span>
                  <span>contratos</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </Card>

          {/* 4. Tareas activas */}
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
            <div className="mb-3">
              <h2 className="text-sm font-semibold">Vencimientos próximos</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permisos y contratos · próximos 90 días
              </p>
            </div>
            <ExpiryList items={proximosVencimientos} />
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
  );
}
