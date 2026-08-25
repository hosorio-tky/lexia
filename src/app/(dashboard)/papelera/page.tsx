import AppShell from "@/components/layout/app-shell";
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
    <AppShell
      breadcrumb="Inicio › Papelera"
      title="Papelera"
      user={{
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
        tenant_nombre:   session.tenant_nombre,
      }}
    >
      <PapeleraClient
        permisos={permisos}
        contratos={contratos}
        lexbase={lexbase}
      />
    </AppShell>
  );
}
