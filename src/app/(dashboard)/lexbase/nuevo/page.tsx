import { notFound } from "next/navigation";
import { LexbaseUploadForm } from "@/components/lexbase/lexbase-upload-form";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLexbaseRepository } from "@/lib/repositories/lexbase";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LexbaseNuevoPage() {
  const session = await getSession();
  if (session.rol === "solo_lectura") notFound();

  const client  = createAdminClient();
  const repo    = createLexbaseRepository(client, session.tenant_id);

  const categorias = await repo.listCategorias();

  return (
        <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Agregar documento</h1>
      </div>
      <LexbaseUploadForm categorias={categorias} />
    </>
  );
}
