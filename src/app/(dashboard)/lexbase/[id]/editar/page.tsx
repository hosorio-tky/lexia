import { notFound } from "next/navigation";
import AppShell from "@/components/layout/app-shell";
import { LexbaseEditForm } from "@/components/lexbase/lexbase-edit-form";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLexbaseRepository } from "@/lib/repositories/lexbase";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LexbaseEditarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createLexbaseRepository(client, session.tenant_id);

  const [documento, categorias] = await Promise.all([
    repo.getById(id),
    repo.listCategorias(),
  ]);

  if (!documento) notFound();

  return (
    <AppShell
      breadcrumb={`Inicio › Lexbase › ${documento.titulo} › Editar`}
      title="Editar documento"
      user={{
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
      }}
    >
      <LexbaseEditForm documento={documento} categorias={categorias} />
    </AppShell>
  );
}
