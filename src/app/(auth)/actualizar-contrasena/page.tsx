import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActualizarContrasenaForm } from "@/components/auth/recuperar-form";

export default async function ActualizarContrasenaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const forced = !!user?.app_metadata?.must_change_password;

  // Si el usuario tiene MFA enrollado pero la sesión está en AAL1, necesita
  // completar el challenge antes de poder cambiar la contraseña (requisito de Supabase).
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") {
    redirect("/mfa/challenge?next=/actualizar-contrasena");
  }

  return <ActualizarContrasenaForm forced={forced} />;
}
