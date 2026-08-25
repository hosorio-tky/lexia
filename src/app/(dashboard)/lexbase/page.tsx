import AppShell from "@/components/layout/app-shell";
import { LexbaseListClient } from "@/components/lexbase/lexbase-list-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLexbaseRepository } from "@/lib/repositories/lexbase";
import { getSession } from "@/lib/auth/session";
import type { LexbaseTipo } from "@/types/lexbase";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function LexbasePage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string; search?: string; tipo?: string;
    cat?: string; pais?: string; reformas?: string; tag?: string;
  }>;
}) {
  const params  = await searchParams;
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createLexbaseRepository(client, session.tenant_id);

  const page = Math.max(0, parseInt(params.page ?? "0", 10) || 0);

  // Decode tiene_reformas from URL string
  const tieneReformas =
    params.reformas === "true"  ? true  :
    params.reformas === "false" ? false :
    null;

  const filters = {
    search:         params.search || undefined,
    tipo:           (params.tipo  || "") as LexbaseTipo | "",
    categoria_id:   params.cat   || "",
    pais:           params.pais  || "",
    tiene_reformas: tieneReformas,
    tag:            params.tag   || "",
    page,
    limit: PAGE_SIZE,
  };

  const [{ items: documentos, total }, categorias, stats] = await Promise.all([
    repo.list(filters),
    repo.listCategorias(),
    repo.getStats(),
  ]);

  // Unique paises and tags for filter dropdowns (across ALL docs, not just current page)
  const { data: fv } = await client
    .from("lexbase_documentos")
    .select("pais, tags")
    .eq("tenant_id", session.tenant_id);
  const paises  = [...new Set((fv ?? []).map((r) => r.pais).filter(Boolean))].sort() as string[];
  const allTags = [...new Set((fv ?? []).flatMap((r) => (r.tags as string[]) ?? []).filter(Boolean))].sort() as string[];

  return (
    <AppShell
      breadcrumb="Inicio › Lexbase"
      title="Lexbase"
      user={{
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
        tenant_nombre:   session.tenant_nombre,
      }}
    >
      <LexbaseListClient
        docs={documentos}
        categorias={categorias}
        stats={stats}
        paises={paises}
        allTags={allTags}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </AppShell>
  );
}
