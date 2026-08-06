import type { SupabaseClient } from "@supabase/supabase-js";
import type { Grupo, GrupoMiembro } from "@/types/access-control";

export function createGruposRepository(client: SupabaseClient, tenantId: string) {
  return {
    async list(): Promise<Grupo[]> {
      const { data, error } = await client
        .from("grupos")
        .select(`
          *,
          miembros_count:grupo_miembros(count)
        `)
        .eq("tenant_id", tenantId)
        .order("nombre");
      if (error) throw error;
      return (data ?? []).map((g) => ({
        ...g,
        miembros_count: g.miembros_count?.[0]?.count ?? 0,
      }));
    },

    async getById(id: string): Promise<Grupo & { miembros: GrupoMiembro[] }> {
      const { data, error } = await client
        .from("grupos")
        .select(`
          *,
          miembros:grupo_miembros(
            id, user_id, added_by, created_at,
            profile:profiles(nombre, apellido, email, rol)
          )
        `)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();
      if (error) throw error;
      type RawMiembro = { id: string; user_id: string; added_by: string | null; created_at: string; profile: { nombre?: string; apellido?: string; email?: string; rol?: string } | null };
      return {
        ...data,
        miembros: (data.miembros ?? []).map((m: RawMiembro) => ({
          id:         m.id,
          tenant_id:  tenantId,
          grupo_id:   id,
          user_id:    m.user_id,
          added_by:   m.added_by ?? undefined,
          created_at: m.created_at,
          nombre:     m.profile?.nombre,
          apellido:   m.profile?.apellido,
          email:      m.profile?.email,
          rol:        m.profile?.rol,
        })),
      };
    },

    async create(input: { nombre: string; descripcion?: string; color?: string }): Promise<Grupo> {
      const { data, error } = await client
        .from("grupos")
        .insert({ tenant_id: tenantId, ...input })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(id: string, input: { nombre?: string; descripcion?: string; color?: string }): Promise<void> {
      const { error } = await client
        .from("grupos")
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },

    async delete(id: string): Promise<void> {
      const { error } = await client
        .from("grupos")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },

    async addMember(grupoId: string, userId: string): Promise<void> {
      const { error } = await client
        .from("grupo_miembros")
        .insert({ tenant_id: tenantId, grupo_id: grupoId, user_id: userId });
      if (error && error.code !== "23505") throw error; // ignore unique violation
    },

    async removeMember(grupoId: string, userId: string): Promise<void> {
      const { error } = await client
        .from("grupo_miembros")
        .delete()
        .eq("grupo_id", grupoId)
        .eq("user_id", userId)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },

    async listMiembros(grupoId: string): Promise<GrupoMiembro[]> {
      const { data: rows, error } = await client
        .from("grupo_miembros")
        .select("id, user_id, added_by, created_at")
        .eq("grupo_id", grupoId)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      if (!rows || rows.length === 0) return [];

      const userIds = rows.map((r) => r.user_id);
      const { data: profiles, error: profilesError } = await client
        .from("profiles")
        .select("id, nombre, apellido, email, rol")
        .in("id", userIds);
      if (profilesError) throw profilesError;

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      return rows.map((m) => {
        const p = profileMap.get(m.user_id);
        return {
          id:         m.id,
          tenant_id:  tenantId,
          grupo_id:   grupoId,
          user_id:    m.user_id,
          added_by:   m.added_by,
          created_at: m.created_at,
          nombre:     p?.nombre,
          apellido:   p?.apellido,
          email:      p?.email,
          rol:        p?.rol,
        };
      });
    },
  };
}
