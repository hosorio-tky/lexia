import { notFound }           from "next/navigation";
import { createAdminClient }  from "@/lib/supabase/admin";
import { getSession }         from "@/lib/auth/session";
import { createContratoPlantillasRepository } from "@/lib/repositories/contrato-plantillas";
import { PlantillaFormClient } from "@/components/configuracion/plantilla-form-client";
import { updatePlantilla }     from "@/app/actions/contrato-plantillas";

export const dynamic = "force-dynamic";

export default async function EditarPlantillaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }  = await params;
  const session = await getSession();
  const repo    = createContratoPlantillasRepository(createAdminClient(), session.tenant_id);
  const item    = await repo.getById(id);

  if (!item) notFound();

  return (
    <PlantillaFormClient
      mode="edit"
      action={updatePlantilla}
      defaultValues={item}
      backHref="/configuracion/plantillas"
    />
  );
}
