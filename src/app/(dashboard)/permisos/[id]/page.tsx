import { notFound } from "next/navigation";
import AppShell from "@/components/layout/app-shell";
import { PermitDetailClient } from "@/components/permisos/permit-detail-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPermisosRepository } from "@/lib/repositories/permisos";
import { createUsuariosRepository } from "@/lib/repositories/usuarios";
import { createTareasRepository } from "@/lib/repositories/tareas";
import { createComentariosRepository } from "@/lib/repositories/comentarios";
import { createNotasRepository } from "@/lib/repositories/notas";
import { createActividadRepository } from "@/lib/repositories/actividad";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function PermisoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, getSession()]);
  const client = createAdminClient();

  const repo = createPermisosRepository(client, session.tenant_id);

  const [permit, timeline, fechasHistorial, usuarios, tareas, comentarios, notas, actividad] =
    await Promise.all([
      repo.getById(id),
      repo.getTimeline(id),
      repo.getFechasHistorial(id),
      createUsuariosRepository(client, session.tenant_id).list(),
      createTareasRepository(client, session.tenant_id).list({
        modulo_origen: "permisos",
        recurso_id:    id,
      }),
      createComentariosRepository(client, session.tenant_id).list("permisos", id),
      createNotasRepository(client, session.tenant_id).list("permisos", id),
      createActividadRepository(client, session.tenant_id).listByRecurso(id),
    ]);

  if (!permit) notFound();

  return (
    <AppShell
      breadcrumb={`Inicio › Permisos › ${permit.numero_expediente ?? id}`}
      title={permit.nombre}
      user={{
        id:              session.user_id,
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
      }}
    >
      <PermitDetailClient
        permit={permit}
        timeline={timeline}
        fechasHistorial={fechasHistorial}
        usuarios={usuarios}
        tareas={tareas}
        comentarios={comentarios}
        notas={notas}
        actividad={actividad}
        userId={session.user_id}
      />
    </AppShell>
  );
}
