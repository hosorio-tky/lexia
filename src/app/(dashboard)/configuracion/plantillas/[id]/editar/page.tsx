import { notFound }           from "next/navigation";
import { createAdminClient }  from "@/lib/supabase/admin";
import { getSession }         from "@/lib/auth/session";
import { createContratoPlantillasRepository } from "@/lib/repositories/contrato-plantillas";
import { createConfiguracionRepository } from "@/lib/repositories/configuracion";
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
  const admin   = createAdminClient();
  const [item, tiposContrato] = await Promise.all([
    createContratoPlantillasRepository(admin, session.tenant_id).getById(id),
    createConfiguracionRepository(admin, session.tenant_id)
      .getCatalogos("contratos", "tipo_contrato")
      .then((items) => items.filter((i) => i.activo))
      .catch(() => []),
  ]);

  if (!item) notFound();

  return (
    <PlantillaFormClient
      mode="edit"
      action={updatePlantilla}
      defaultValues={item}
      backHref="/configuracion/plantillas"
      tiposContrato={tiposContrato}
    />
  );
}
