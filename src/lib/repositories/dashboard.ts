import type { SupabaseClient } from "@supabase/supabase-js";
import { differenceInDays, parseISO, addDays } from "date-fns";
import { ESTADOS_PERMISO, ESTADOS_CONTRATO } from "@/lib/constants/estados";

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
  modulo: "permiso" | "contrato";
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
  contratos: {
    vigentes: number;
    porVencer30: number;
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
        contratosRes,
        tareasRes,
        tareasUrgentesRes,
        notifsRes,
        actividadRes,
      ] = await Promise.all([
        // 1. Todos los permisos del tenant
        client
          .from("permisos")
          .select(
            "id, nombre, numero_expediente, estado_id, estado_ref:workflow_estados!estado_id(valor), fecha_vencimiento"
          )
          .eq("tenant_id", tenantId),

        // 2. Contratos activos (excluye terminados y cancelados)
        client
          .from("contratos")
          .select(
            "id, titulo, numero, estado_id, estado_ref:workflow_estados!estado_id(valor), fecha_fin"
          )
          .eq("tenant_id", tenantId)
          .not("estado_id", "in", `("${ESTADOS_CONTRATO.TERMINADO}","${ESTADOS_CONTRATO.CANCELADO}")`)
          .is("deleted_at", null),

        // 3. Todas las tareas no canceladas
        client
          .from("tareas")
          .select("id, titulo, estado, prioridad, asignado_nombre, fecha_limite")
          .eq("tenant_id", tenantId)
          .neq("estado", "cancelada"),

        // 4. Tareas urgente/alta no completadas (para la lista)
        client
          .from("tareas")
          .select("id, titulo, prioridad, estado, asignado_nombre, fecha_limite")
          .eq("tenant_id", tenantId)
          .in("prioridad", ["urgente", "alta"])
          .not("estado", "in", '("completada","cancelada")')
          .order("prioridad", { ascending: false }) // urgente primero
          .order("created_at", { ascending: false })
          .limit(5),

        // 5. Conteo notificaciones sin leer
        client
          .from("notificaciones")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("user_id", userId)
          .eq("leida", false),

        // 6. Actividad reciente
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
      type PermisoRaw = {
        id: string;
        nombre: string;
        numero_expediente: string | null;
        estado_id: string;
        // PostgREST returns FK joins as an array
        estado_ref: Array<{ valor: string }> | { valor: string } | null;
        fecha_vencimiento: string | null;
      };
      const permisos = ((permisosRes.data ?? []) as unknown as PermisoRaw[]).map((p) => {
        const ref = Array.isArray(p.estado_ref) ? p.estado_ref[0] : p.estado_ref;
        return { ...p, estado: ref?.valor ?? p.estado_id };
      });

      // Conteo por estado
      const estadoMap: Record<string, number> = {};
      let vencidos = 0;
      let activos  = 0;

      for (const p of permisos) {
        estadoMap[p.estado] = (estadoMap[p.estado] ?? 0) + 1;
        if (p.estado_id === ESTADOS_PERMISO.RECHAZADO) vencidos++;
        if (p.estado_id !== ESTADOS_PERMISO.RECHAZADO) activos++;
      }

      const porEstado: EstadoCount[] = Object.entries(estadoMap)
        .map(([estado, count]) => ({ estado, count }))
        .sort((a, b) => b.count - a.count);

      // Próximos vencimientos de permisos (≤90 días, no rechazados)
      const proximosVencimientos: ProximoVencimiento[] = permisos
        .filter((p) => {
          if (!p.fecha_vencimiento) return false;
          const fv = parseISO(p.fecha_vencimiento);
          return fv <= en90 && p.estado_id !== ESTADOS_PERMISO.RECHAZADO;
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
            modulo:            "permiso" as const,
          };
        })
        .sort((a, b) => a.diasRestantes - b.diasRestantes)
        .slice(0, 7);

      const proximos30 = proximosVencimientos.filter((p) => p.diasRestantes <= 30).length;
      const proximos90 = proximosVencimientos.length;

      // ── Contratos ─────────────────────────────────────────
      type ContratoRaw = {
        id: string;
        titulo: string;
        numero: string | null;
        estado_id: string;
        estado_ref: Array<{ valor: string }> | { valor: string } | null;
        fecha_fin: string | null;
      };
      const contratos = ((contratosRes.data ?? []) as unknown as ContratoRaw[]).map((c) => {
        const ref = Array.isArray(c.estado_ref) ? c.estado_ref[0] : c.estado_ref;
        return { ...c, estado: ref?.valor ?? c.estado_id };
      });

      const vigentes = contratos.filter((c) => c.estado_id === ESTADOS_CONTRATO.VIGENTE).length;

      const contratosProximos: ProximoVencimiento[] = contratos
        .filter((c) => {
          if (!c.fecha_fin) return false;
          return parseISO(c.fecha_fin) <= en90;
        })
        .map((c) => {
          const dias = differenceInDays(parseISO(c.fecha_fin!), hoy);
          return {
            id:                c.id,
            nombre:            c.titulo,
            numero_expediente: c.numero,
            estado:            c.estado,
            fecha_vencimiento: c.fecha_fin!,
            diasRestantes:     dias,
            semaforo:          getSemaforo(dias),
            modulo:            "contrato" as const,
          };
        })
        .sort((a, b) => a.diasRestantes - b.diasRestantes)
        .slice(0, 7);

      const porVencer30 = contratosProximos.filter((c) => c.diasRestantes <= 30).length;

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
        contratos: {
          vigentes,
          porVencer30,
          proximosVencimientos: contratosProximos,
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
