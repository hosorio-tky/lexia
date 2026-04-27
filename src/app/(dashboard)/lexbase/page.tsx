import AppShell from "@/components/layout/app-shell";
import { LexbaseListClient } from "@/components/lexbase/lexbase-list-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLexbaseRepository } from "@/lib/repositories/lexbase";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LexbasePage() {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createLexbaseRepository(client, session.tenant_id);

  const [documentos, categorias] = await Promise.all([
    repo.list(),
    repo.listCategorias(),
  ]);

  return (
    <AppShell
      breadcrumb="Inicio › Lexbase"
      title="Lexbase"
      user={{
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
      }}
    >
      <LexbaseListClient
        initialDocs={documentos}
        initialCategorias={categorias}
      />
    </AppShell>
  );
}
