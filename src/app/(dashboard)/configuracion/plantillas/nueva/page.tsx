import { PlantillaFormClient } from "@/components/configuracion/plantilla-form-client";
import { createPlantilla }     from "@/app/actions/contrato-plantillas";

export default function NuevaPlantillaPage() {
  return (
    <PlantillaFormClient
      mode="create"
      action={createPlantilla}
      backHref="/configuracion/plantillas"
    />
  );
}
