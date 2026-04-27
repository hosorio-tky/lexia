import type { SupabaseClient } from "@supabase/supabase-js";
import type { Notificacion, NotificacionFilters } from "@/types/notifications";

export function createNotificacionesRepository(
  client: SupabaseClient,
  tenantId: string
) {
  return {
    /** Últimas N notificaciones del usuario (para el Bell) */
    async getRecientes(userId: string, limit = 15): Promise<Notificacion[]> {
      const { data, error } = await client
        .from("notificaciones")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as Notificacion[];
    },

    /** Conteo de no leídas (para el badge) */
    async getUnreadCount(userId: string): Promise<number> {
      const { count, error } = await client
        .from("notificaciones")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .eq("leida", false);

      if (error) throw error;
      return count ?? 0;
    },

    /** Lista completa con filtros (para la página /notificaciones) */
    async getAll(
      userId: string,
      filters: NotificacionFilters = {}
    ): Promise<Notificacion[]> {
      let q = client
        .from("notificaciones")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (filters.leida !== undefined && filters.leida !== null) {
        q = q.eq("leida", filters.leida);
      }
      if (filters.modulo) {
        q = q.eq("modulo", filters.modulo);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Notificacion[];
    },

    /** Marcar una como leída */
    async markAsRead(id: string): Promise<void> {
      const { error } = await client
        .from("notificaciones")
        .update({ leida: true })
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (error) throw error;
    },

    /** Marcar todas las del usuario como leídas */
    async markAllAsRead(userId: string): Promise<void> {
      const { error } = await client
        .from("notificaciones")
        .update({ leida: true })
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .eq("leida", false);

      if (error) throw error;
    },

    /** Eliminar una notificación */
    async delete(id: string): Promise<void> {
      const { error } = await client
        .from("notificaciones")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (error) throw error;
    },

    /** Disparar la función SQL de generación de alertas de vencimiento */
    async generarAlertasVencimiento(): Promise<number> {
      const { data, error } = await client.rpc(
        "generar_alertas_vencimiento",
        { p_tenant_id: tenantId }
      );

      if (error) throw error;
      return (data as number) ?? 0;
    },
  };
}
