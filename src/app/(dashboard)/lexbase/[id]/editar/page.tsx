import { notFound } from "next/navigation";
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
  if (session.rol === "solo_lectura") notFound();

  const client  = createAdminClient();
  const repo    = createLexbaseRepository(client, session.tenant_id);

  const [documento, categorias] = await Promise.all([
    repo.getById(id),
    repo.listCategorias(),
  ]);

  if (!documento) notFound();

  return (
        <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Editar documento</h1>
      </div>
      <LexbaseEditForm documento={documento} categorias={categorias} userRol={session.rol} />
    </>
  );
}
