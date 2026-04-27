import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile, ActivityEvent, UserRole } from "@/types/users";

// ─── Tipos de filas DB ────────────────────────────────────────
interface ProfileRow {
  id: string;
  tenant_id: string;
  nombre: string;
  apellido: string | null;
  email: string;
  rol: string;
  avatar_url: string | null;
  activo: boolean;
  cargo: string | null;
  departamento: string | null;
  telefono: string | null;
  ultimo_acceso: string | null;
  created_at: string;
  updated_at: string;
}

interface ActivityRow {
  id: string;
  user_nombre: string | null;
  accion: string;
  modulo: string | null;
  recurso_id: string | null;
  recurso_desc: string | null;
  created_at: string;
}

// ─── Mappers ──────────────────────────────────────────────────
function mapProfile(row: ProfileRow): UserProfile {
  const apellido = row.apellido ?? undefined;
  const nombre_completo = apellido
    ? `${row.nombre} ${apellido}`
    : row.nombre;
  const iniciales = nombre_completo
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return {
    id:            row.id,
    tenant_id:     row.tenant_id,
    nombre:        row.nombre,
    apellido,
    email:         row.email,
    rol:           row.rol as UserRole,
    avatar_url:    row.avatar_url ?? undefined,
    activo:        row.activo,
    cargo:         row.cargo ?? undefined,
    departamento:  row.departamento ?? undefined,
    telefono:      row.telefono ?? undefined,
    ultimo_acceso: row.ultimo_acceso ?? undefined,
    created_at:    row.created_at,
    updated_at:    row.updated_at,
    nombre_completo,
    iniciales,
  };
}

function mapActivity(row: ActivityRow): ActivityEvent {
  return {
    id:           row.id,
    user_nombre:  row.user_nombre ?? undefined,
    accion:       row.accion,
    modulo:       row.modulo ?? undefined,
    recurso_id:   row.recurso_id ?? undefined,
    recurso_desc: row.recurso_desc ?? undefined,
    created_at:   row.created_at,
  };
}

// ─── Repositorio ──────────────────────────────────────────────
// tenantId es obligatorio cuando se usa admin client (sin RLS).
// Garantiza aislamiento multi-tenant en todas las queries.
export function createUsuariosRepository(client: SupabaseClient, tenantId: string) {
  return {
    // Lista todos los perfiles del tenant
    async list(): Promise<UserProfile[]> {
      const { data, error } = await client
        .from("profiles")
        .select("*")
        .eq("tenant_id", tenantId)          // ← aislamiento tenant
        .order("nombre", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => mapProfile(r as ProfileRow));
    },

    // Perfil de un usuario concreto
    async getById(id: string): Promise<UserProfile | null> {
      const { data, error } = await client
        .from("profiles")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", tenantId)          // ← evita acceso cross-tenant
        .single();
      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      return mapProfile(data as ProfileRow);
    },

    // Actualizar perfil propio o (admin) de otro
    async update(
      id: string,
      input: Partial<{
        nombre: string;
        apellido: string;
        cargo: string;
        departamento: string;
        telefono: string;
        rol: UserRole;
        activo: boolean;
      }>
    ): Promise<UserProfile> {
      const { data, error } = await client
        .from("profiles")
        .update(input)
        .eq("id", id)
        .eq("tenant_id", tenantId)          // ← evita edición cross-tenant
        .select()
        .single();
      if (error) throw error;
      return mapProfile(data as ProfileRow);
    },

    // Log de actividad de un usuario
    async getActivity(userId: string): Promise<ActivityEvent[]> {
      const { data, error } = await client
        .from("user_activity_log")
        .select("id, user_nombre, accion, modulo, recurso_id, recurso_desc, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((r) => mapActivity(r as ActivityRow));
    },

    // Registrar una acción en el log
    async logActivity(input: {
      tenant_id: string;
      user_id: string;
      user_nombre: string;
      accion: string;
      modulo?: string;
      recurso_id?: string;
      recurso_desc?: string;
    }): Promise<void> {
      await client.from("user_activity_log").insert(input);
    },
  };
}
