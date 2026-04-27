import AppShell from "@/components/layout/app-shell";
import { LexbaseUploadForm } from "@/components/lexbase/lexbase-upload-form";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLexbaseRepository } from "@/lib/repositories/lexbase";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LexbaseNuevoPage() {
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createLexbaseRepository(client, session.tenant_id);

  const categorias = await repo.listCategorias();

  return (
    <AppShell
      breadcrumb="Inicio › Lexbase › Nuevo documento"
      title="Agregar documento"
      user={{
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
      }}
    >
      <LexbaseUploadForm categorias={categorias} />
    </AppShell>
  );
}
