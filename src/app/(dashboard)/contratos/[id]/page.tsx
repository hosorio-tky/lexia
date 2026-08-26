import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ContratoDetailClient } from "@/components/contratos/contrato-detail-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createContratosRepository } from "@/lib/repositories/contratos";
import { createComentariosRepository } from "@/lib/repositories/comentarios";
import { createNotasRepository } from "@/lib/repositories/notas";
import { createActividadRepository } from "@/lib/repositories/actividad";
import { createTareasRepository } from "@/lib/repositories/tareas";
import { createUsuariosRepository } from "@/lib/repositories/usuarios";
import { createAccesoRepository, getUserNivel } from "@/lib/repositories/acceso";
import { createGruposRepository } from "@/lib/repositories/grupos";
import { createSuscripcionesRepository } from "@/lib/repositories/suscripciones";
import { createResponsablesRepository } from "@/lib/repositories/responsables";
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

  const suscRepo = createSuscripcionesRepository(client, session.tenant_id);

  const [contrato, versiones, comentarios, notas, actividad, tareas, usuarios, responsables, accesos, grupos] = await Promise.all([
    repo.getById(id, { userId: session.user_id, userRol: session.rol }),
    repo.getVersiones(id),
    createComentariosRepository(client, session.tenant_id).list("contratos", id),
    createNotasRepository(client, session.tenant_id).list("contratos", id),
    createActividadRepository(client, session.tenant_id).listByRecurso(id),
    createTareasRepository(client, session.tenant_id).list({
      modulo_origen: "contratos",
      recurso_id:    id,
    }),
    createUsuariosRepository(client, session.tenant_id).list(),
    createResponsablesRepository(client, session.tenant_id).list(),
    createAccesoRepository(client, session.tenant_id).listByResource("contrato", id),
    createGruposRepository(client, session.tenant_id).list(),
  ]);

  if (!contrato) notFound();

  const [nivel, isSuscrito, suscripciones] = await Promise.all([
    getUserNivel(client, session.tenant_id, "contrato", id, session.user_id, session.rol, contrato.created_by),
    suscRepo.isSuscrito("contrato", id, session.user_id),
    suscRepo.listByResource("contrato", id),
  ]);

  return (
        <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{contrato.titulo}</h1>
      </div>
      <Suspense>
        <ContratoDetailClient
          contrato={contrato}
          versiones={versiones}
          comentarios={comentarios}
          notas={notas}
          actividad={actividad}
          tareas={tareas}
          usuarios={usuarios}
          responsables={responsables}
          accesos={accesos}
          grupos={grupos}
          userId={session.user_id}
          userRol={session.rol}
          canEdit={nivel === "edicion"}
          isSuscrito={isSuscrito}
          suscripciones={suscripciones}
        />
      </Suspense>
    </>
  );
}
