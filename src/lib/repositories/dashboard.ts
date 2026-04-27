import type { SupabaseClient } from "@supabase/supabase-js";
import { differenceInDays, parseISO, isBefore, addDays } from "date-fns";

// ─── Tipos de salida ──────────────────────────────────────────

export interface EstadoCount {
  estado: string;
  count: number;
}

export interface ProximoVencimiento {
  id: string;
  nombre: string;
  numero_expediente: string | null;
  estado: string;
  fecha_vencimiento: string;
  diasRestantes: number;
  semaforo: "vencido" | "critico" | "advertencia" | "proximo" | "ok";
}

export interface TareaUrgente {
  id: string;
  titulo: string;
  prioridad: string;
  estado: string;
  asignado_nombre: string | null;
  fecha_limite: string | null;
}

export interface ActivityItem {
  id: string;
  user_nombre: string;
  accion: string;
  modulo: string;
  recurso_desc: string | null;
  created_at: string;
}

export interface DashboardStats {
  permisos: {
    total: number;
    activos: number;      // excluye Vencido + Suspendido
    vencidos: number;
    proximos30: number;   // vencen en ≤30 días (no vencidos)
    proximos90: number;   // vencen en ≤90 días (no vencidos)
    porEstado: EstadoCount[];
    proximosVencimientos: ProximoVencimiento[];
  };
  tareas: {
    total: number;
    pendientes: number;
    enProgreso: number;
    completadas: number;
    urgentesAltas: number;
    porPrioridad: EstadoCount[];
    urgentes: TareaUrgente[];
  };
  notificaciones: {
    sinLeer: number;
  };
  actividad: ActivityItem[];
}

// ─── Semáforo ─────────────────────────────────────────────────

function getSemaforo(diasRestantes: number): ProximoVencimiento["semaforo"] {
  if (diasRestantes < 0)  return "vencido";
  if (diasRestantes <= 7) return "critico";
  if (diasRestantes <= 30) return "advertencia";
  if (diasRestantes <= 90) return "proximo";
  return "ok";
}

// ─── Repositorio ─────────────────────────────────────────────

export function createDashboardRepository(
  client: SupabaseClient,
  tenantId: string
) {
  return {
    async getStats(userId: string): Promise<DashboardStats> {
      const hoy    = new Date();
      const en90   = addDays(hoy, 90);

      // ── Fetch paralelo ────────────────────────────────────
      const [
        permisosRes,
        tareasRes,
        tareasUrgentesRes,
        notifsRes,
        actividadRes,
      ] = await Promise.all([
        // 1. Todos los permisos del tenant
        client
          .from("permisos")
          .select(
            "id, nombre, numero_expediente, estado, fecha_vencimiento"
          )
          .eq("tenant_id", tenantId),

        // 2. Todas las tareas no canceladas
        client
          .from("tareas")
          .select("id, titulo, estado, prioridad, asignado_nombre, fecha_limite")
          .eq("tenant_id", tenantId)
          .neq("estado", "cancelada"),

        // 3. Tareas urgente/alta no completadas (para la lista)
        client
          .from("tareas")
          .select("id, titulo, prioridad, estado, asignado_nombre, fecha_limite")
          .eq("tenant_id", tenantId)
          .in("prioridad", ["urgente", "alta"])
          .not("estado", "in", '("completada","cancelada")')
          .order("prioridad", { ascending: false }) // urgente primero
          .order("created_at", { ascending: false })
          .limit(5),

        // 4. Conteo notificaciones sin leer
        client
          .from("notificaciones")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("user_id", userId)
          .eq("leida", false),

        // 5. Actividad reciente
        client
          .from("user_activity_log")
          .select(
            "id, user_nombre, accion, modulo, recurso_desc, created_at"
          )
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      // ── Permisos ──────────────────────────────────────────
      const permisos = (permisosRes.data ?? []) as Array<{
        id: string;
        nombre: string;
        numero_expediente: string | null;
        estado: string;
        fecha_vencimiento: string | null;
      }>;

      // Conteo por estado
      const estadoMap: Record<string, number> = {};
      let vencidos = 0;
      let activos  = 0;

      for (const p of permisos) {
        estadoMap[p.estado] = (estadoMap[p.estado] ?? 0) + 1;
        if (p.estado === "Vencido") vencidos++;
        if (!["Vencido", "Suspendido"].includes(p.estado)) activos++;
      }

      const porEstado: EstadoCount[] = Object.entries(estadoMap)
        .map(([estado, count]) => ({ estado, count }))
        .sort((a, b) => b.count - a.count);

      // Próximos vencimientos (≤90 días, no vencidos en estado)
      const proximosVencimientos: ProximoVencimiento[] = permisos
        .filter((p) => {
          if (!p.fecha_vencimiento) return false;
          const fv = parseISO(p.fecha_vencimiento);
          return fv <= en90 && p.estado !== "Vencido" && p.estado !== "Suspendido";
        })
        .map((p) => {
          const dias = differenceInDays(parseISO(p.fecha_vencimiento!), hoy);
          return {
            id:                p.id,
            nombre:            p.nombre,
            numero_expediente: p.numero_expediente,
            estado:            p.estado,
            fecha_vencimiento: p.fecha_vencimiento!,
            diasRestantes:     dias,
            semaforo:          getSemaforo(dias),
          };
        })
        .sort((a, b) => a.diasRestantes - b.diasRestantes)
        .slice(0, 7);

      const proximos30 = proximosVencimientos.filter((p) => p.diasRestantes <= 30).length;
      const proximos90 = proximosVencimientos.length;

      // ── Tareas ────────────────────────────────────────────
      const tareas = (tareasRes.data ?? []) as Array<{
        id: string;
        titulo: string;
        estado: string;
        prioridad: string;
        asignado_nombre: string | null;
        fecha_limite: string | null;
      }>;

      let pendientes  = 0;
      let enProgreso  = 0;
      let completadas = 0;
      let urgentesAltas = 0;
      const prioridadMap: Record<string, number> = {};

      for (const t of tareas) {
        if (t.estado === "pendiente")   pendientes++;
        if (t.estado === "en_progreso") enProgreso++;
        if (t.estado === "completada")  completadas++;
        if (
          ["urgente", "alta"].includes(t.prioridad) &&
          !["completada", "cancelada"].includes(t.estado)
        ) urgentesAltas++;
        prioridadMap[t.prioridad] = (prioridadMap[t.prioridad] ?? 0) + 1;
      }

      const porPrioridad: EstadoCount[] = [
        "urgente", "alta", "media", "baja",
      ].map((p) => ({ estado: p, count: prioridadMap[p] ?? 0 }));

      const urgentes = (tareasUrgentesRes.data ?? []) as TareaUrgente[];

      // ── Actividad ─────────────────────────────────────────
      const actividad = (actividadRes.data ?? []) as ActivityItem[];

      return {
        permisos: {
          total: permisos.length,
          activos,
          vencidos,
          proximos30,
          proximos90,
          porEstado,
          proximosVencimientos,
        },
        tareas: {
          total: tareas.length,
          pendientes,
          enProgreso,
          completadas,
          urgentesAltas,
          porPrioridad,
          urgentes,
        },
        notificaciones: {
          sinLeer: notifsRes.count ?? 0,
        },
        actividad,
      };
    },
  };
}
