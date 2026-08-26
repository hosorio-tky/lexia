import { PapeleraClient } from "@/components/papelera/papelera-client";
import { getSession } from "@/lib/auth/session";
import {
  listarPapeleraPermisos,
  listarPapeleraContratos,
  listarPapeleraLexbase,
} from "@/app/actions/papelera";

export const dynamic = "force-dynamic";

export default async function PapeleraPage() {
  const session = await getSession();

  const [permisos, contratos, lexbase] = await Promise.all([
    listarPapeleraPermisos(),
    listarPapeleraContratos(),
    listarPapeleraLexbase(),
  ]);

  return (
        <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Papelera</h1>
      </div>
      <PapeleraClient
        permisos={permisos}
        contratos={contratos}
        lexbase={lexbase}
      />
    </>
  );
}
