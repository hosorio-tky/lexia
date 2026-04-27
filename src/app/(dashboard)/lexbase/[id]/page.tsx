import { notFound } from "next/navigation";
import AppShell from "@/components/layout/app-shell";
import { LexbaseViewer } from "@/components/lexbase/lexbase-viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLexbaseRepository } from "@/lib/repositories/lexbase";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LexbaseDocumentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const client  = createAdminClient();
  const repo    = createLexbaseRepository(client, session.tenant_id);

  const documento = await repo.getById(id);
  if (!documento) notFound();

  // Build proxy URL (same-origin, bypasses Supabase iframe restrictions)
  const fileUrl = documento.storage_path
    ? `/api/lexbase/file?path=${encodeURIComponent(documento.storage_path)}`
    : undefined;

  return (
    <AppShell
      breadcrumb={`Inicio › Lexbase › ${documento.titulo}`}
      user={{
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
      }}
    >
      <LexbaseViewer documento={documento} fileUrl={fileUrl} />
    </AppShell>
  );
}
