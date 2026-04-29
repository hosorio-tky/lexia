import { notFound } from "next/navigation";
import AppShell from "@/components/layout/app-shell";
import { ContratoDetailClient } from "@/components/contratos/contrato-detail-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createContratosRepository } from "@/lib/repositories/contratos";
import { createComentariosRepository } from "@/lib/repositories/comentarios";
import { createNotasRepository } from "@/lib/repositories/notas";
import { createActividadRepository } from "@/lib/repositories/actividad";
import { createTareasRepository } from "@/lib/repositories/tareas";
import { createUsuariosRepository } from "@/lib/repositories/usuarios";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ContratoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, getSession()]);
  const client = createAdminClient();
  const repo   = createContratosRepository(client, session.tenant_id);

  const [contrato, versiones, comentarios, notas, actividad, tareas, usuarios] = await Promise.all([
    repo.getById(id),
    repo.getVersiones(id),
    createComentariosRepository(client, session.tenant_id).list("contratos", id),
    createNotasRepository(client, session.tenant_id).list("contratos", id),
    createActividadRepository(client, session.tenant_id).listByRecurso(id),
    createTareasRepository(client, session.tenant_id).list({
      modulo_origen: "contratos",
      recurso_id:    id,
    }),
    createUsuariosRepository(client, session.tenant_id).list(),
  ]);

  if (!contrato) notFound();

  return (
    <AppShell
      breadcrumb={`Inicio › Contratos › ${contrato.numero ?? id}`}
      title={contrato.titulo}
      user={{
        id:              session.user_id,
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
      }}
    >
      <ContratoDetailClient
        contrato={contrato}
        versiones={versiones}
        comentarios={comentarios}
        notas={notas}
        actividad={actividad}
        tareas={tareas}
        usuarios={usuarios}
        userId={session.user_id}
      />
    </AppShell>
  );
}
