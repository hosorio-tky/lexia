import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  TenantSettings,
  CatalogoItem,
  PlantillaAlerta,
  ModuloCatalogo,
  EventoAlerta,
  CanalAlerta,
} from "@/types/settings";
import type { ActivityEvent } from "@/types/users";

// ─── Tipos de filas DB ────────────────────────────────────────
interface CatalogoRef { id: string; valor: string; }

interface TenantRow {
  id: string;
  nombre: string;
  slug: string;
  logo_url: string | null;
  descripcion: string | null;
  sitio_web: string | null;
  industria_id: string | null;
  industria_cat: CatalogoRef | null;
  pais_id: string | null;
  pais_cat: CatalogoRef | null;
  color_marca: string | null;
}

interface CatalogoRow {
  id: string;
  tenant_id: string;
  modulo: string;
  tipo: string;
  valor: string;
  etiqueta: string;
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

interface PlantillaRow {
  id: string;
  tenant_id: string;
  nombre: string;
  modulo: string;
  evento: string;
  dias_antes: number | null;
  frecuencia_dias: number;
  canal: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

interface ActivityRow {
  id: string;
  user_id: string | null;
  user_nombre: string | null;
  accion: string;
  modulo: string | null;
  recurso_id: string | null;
  recurso_desc: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─── Mappers ──────────────────────────────────────────────────
function mapTenant(row: TenantRow): TenantSettings {
  return {
    id:           row.id,
    nombre:       row.nombre,
    slug:         row.slug,
    logo_url:     row.logo_url    ?? undefined,
    descripcion:  row.descripcion ?? undefined,
    sitio_web:    row.sitio_web   ?? undefined,
    industria:    row.industria_cat?.valor ?? undefined,
    industria_id: row.industria_id ?? undefined,
    pais:         row.pais_cat?.valor ?? "El Salvador",
    pais_id:      row.pais_id ?? undefined,
    color_marca:  row.color_marca ?? "#6366f1",
  };
}

function mapCatalogo(row: CatalogoRow): CatalogoItem {
  return {
    id:         row.id,
    tenant_id:  row.tenant_id,
    modulo:     row.modulo as ModuloCatalogo,
    tipo:       row.tipo,
    valor:      row.valor,
    etiqueta:   row.etiqueta,
    activo:     row.activo,
    orden:      row.orden,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapPlantilla(row: PlantillaRow): PlantillaAlerta {
  return {
    id:              row.id,
    tenant_id:       row.tenant_id,
    nombre:          row.nombre,
    modulo:          row.modulo,
    evento:          row.evento as EventoAlerta,
    dias_antes:      row.dias_antes ?? undefined,
    frecuencia_dias: row.frecuencia_dias ?? 1,
    canal:           row.canal as CanalAlerta,
    activo:          row.activo,
    created_at:      row.created_at,
    updated_at:      row.updated_at,
  };
}

function mapActivity(row: ActivityRow): ActivityEvent {
  return {
    id:           row.id,
    user_nombre:  row.user_nombre  ?? undefined,
    accion:       row.accion,
    modulo:       row.modulo       ?? undefined,
    recurso_id:   row.recurso_id   ?? undefined,
    recurso_desc: row.recurso_desc ?? undefined,
    metadata:     row.metadata     ?? undefined,
    created_at:   row.created_at,
  };
}

// ─── Repositorio ──────────────────────────────────────────────
export function createConfiguracionRepository(
  client: SupabaseClient,
  tenantId: string
) {
  return {
    // ── T06-F03: Personalización empresa ──────────────────────
    async getTenantSettings(): Promise<TenantSettings | null> {
      const { data, error } = await client
        .from("tenants")
        .select("id, nombre, slug, logo_url, descripcion, sitio_web, industria_id, industria_cat:catalogos!industria_id(id, valor), pais_id, pais_cat:catalogos!pais_id(id, valor), color_marca")
        .eq("id", tenantId)
        .single();
      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      return mapTenant(data as unknown as TenantRow);
    },

    async updateTenantSettings(
      input: Partial<{
        nombre: string;
        logo_url: string;
        descripcion: string;
        sitio_web: string;
        industria_id: string | null;
        pais_id: string | null;
        color_marca: string;
      }>
    ): Promise<TenantSettings> {
      const { data, error } = await client
        .from("tenants")
        .update(input)
        .eq("id", tenantId)
        .select("id, nombre, slug, logo_url, descripcion, sitio_web, industria_id, industria_cat:catalogos!industria_id(id, valor), pais_id, pais_cat:catalogos!pais_id(id, valor), color_marca")
        .single();
      if (error) throw error;
      return mapTenant(data as unknown as TenantRow);
    },

    // ── T06-F01: Catálogos ─────────────────────────────────────
    async getCatalogos(modulo?: string, tipo?: string): Promise<CatalogoItem[]> {
      let query = client
        .from("catalogos")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("orden", { ascending: true })
        .order("etiqueta", { ascending: true });

      if (modulo) query = query.eq("modulo", modulo);
      if (tipo)   query = query.eq("tipo", tipo);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((r) => mapCatalogo(r as CatalogoRow));
    },

    async createCatalogo(input: {
      modulo: string;
      tipo: string;
      valor: string;
      etiqueta: string;
      orden?: number;
    }): Promise<CatalogoItem> {
      const { data, error } = await client
        .from("catalogos")
        .insert({ ...input, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return mapCatalogo(data as CatalogoRow);
    },

    async updateCatalogo(
      id: string,
      input: Partial<{ valor: string; etiqueta: string; orden: number; activo: boolean }>
    ): Promise<CatalogoItem> {
      const { data, error } = await client
        .from("catalogos")
        .update(input)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();
      if (error) throw error;
      return mapCatalogo(data as CatalogoRow);
    },

    async deleteCatalogo(id: string): Promise<void> {
      const { error } = await client
        .from("catalogos")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },

    // ── T06-F02: Plantillas de alerta ──────────────────────────
    async getPlantillas(modulo?: string): Promise<PlantillaAlerta[]> {
      let query = client
        .from("plantillas_alerta")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("modulo",     { ascending: true })
        .order("dias_antes", { ascending: true });

      if (modulo) query = query.eq("modulo", modulo);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((r) => mapPlantilla(r as PlantillaRow));
    },

    async createPlantilla(input: {
      nombre: string;
      modulo: string;
      evento: string;
      dias_antes?: number;
      frecuencia_dias?: number;
      canal: string;
    }): Promise<PlantillaAlerta> {
      const { data, error } = await client
        .from("plantillas_alerta")
        .insert({ ...input, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return mapPlantilla(data as PlantillaRow);
    },

    async updatePlantilla(
      id: string,
      input: Partial<{
        nombre: string;
        modulo: string;
        evento: string;
        dias_antes: number;
        frecuencia_dias: number;
        canal: string;
        activo: boolean;
      }>
    ): Promise<PlantillaAlerta> {
      const { data, error } = await client
        .from("plantillas_alerta")
        .update(input)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();
      if (error) throw error;
      return mapPlantilla(data as PlantillaRow);
    },

    async deletePlantilla(id: string): Promise<void> {
      const { error } = await client
        .from("plantillas_alerta")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },

    // ── T06-F06: Log de auditoría ──────────────────────────────
    async getAuditLog(filters?: {
      userId?: string;
      modulo?: string;
      search?: string;
      desde?: string;
      hasta?: string;
      page?: number;
      limit?: number;
    }): Promise<{ logs: ActivityEvent[]; total: number }> {
      const limit  = filters?.limit ?? 50;
      const page   = filters?.page  ?? 0;
      const from   = page * limit;
      const to     = from + limit - 1;

      let query = client
        .from("user_activity_log")
        .select("id, user_id, user_nombre, accion, modulo, recurso_id, recurso_desc, metadata, created_at", { count: "exact" })
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (filters?.userId) query = query.eq("user_id", filters.userId);
      if (filters?.modulo) query = query.eq("modulo", filters.modulo);
      if (filters?.desde)  query = query.gte("created_at", filters.desde);
      if (filters?.hasta)  query = query.lte("created_at", filters.hasta + "T23:59:59Z");
      if (filters?.search) {
        const q = `%${filters.search}%`;
        query = query.or(`accion.ilike.${q},user_nombre.ilike.${q},recurso_desc.ilike.${q}`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return {
        logs:  (data ?? []).map((r) => mapActivity(r as ActivityRow)),
        total: count ?? 0,
      };
    },
  };
}
