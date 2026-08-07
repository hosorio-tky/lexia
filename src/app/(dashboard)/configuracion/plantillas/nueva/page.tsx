import { PlantillaFormClient } from "@/components/configuracion/plantilla-form-client";
import { createPlantilla }     from "@/app/actions/contrato-plantillas";
import { createAdminClient }   from "@/lib/supabase/admin";
import { createConfiguracionRepository } from "@/lib/repositories/configuracion";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function NuevaPlantillaPage() {
  const session = await getSession();
  const tiposContrato = await createConfiguracionRepository(createAdminClient(), session.tenant_id)
    .getCatalogos("contratos", "tipo_contrato")
    .then((items) => items.filter((i) => i.activo))
    .catch(() => []);

  return (
    <PlantillaFormClient
      mode="create"
      action={createPlantilla}
      backHref="/configuracion/plantillas"
      tiposContrato={tiposContrato}
    />
  );
}
