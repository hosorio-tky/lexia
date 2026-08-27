import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import AppShell from "@/components/layout/app-shell";
import { InactivityGuard } from "@/components/shared/inactivity-guard";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { verifyTrustedDeviceToken, TRUSTED_DEVICE_COOKIE } from "@/lib/trusted-device";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, supabase] = await Promise.all([getSession(), createClient()]);

  // Check MFA aquí (Node.js serverless, sin límite de Edge).
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal) {
    const hasMfaEnrolled = aal.nextLevel === "aal2";
    const mfaVerified    = aal.currentLevel === "aal2";

    if (hasMfaEnrolled && !mfaVerified) {
      // Verificar dispositivo de confianza
      const cookieStore = await cookies();
      const trustedToken = cookieStore.get(TRUSTED_DEVICE_COOKIE)?.value;
      if (trustedToken && session.user_id) {
        const confiado = await verifyTrustedDeviceToken(trustedToken, session.user_id);
        if (!confiado) redirect("/mfa/challenge");
      } else {
        redirect("/mfa/challenge");
      }
    } else if (!hasMfaEnrolled) {
      redirect("/mfa/setup");
    }
  }

  return (
    <AppShell
      user={{
        id:              session.user_id,
        nombre:          session.nombre,
        nombre_completo: session.nombre_completo,
        email:           session.email,
        rol:             session.rol,
        tenant_nombre:   session.tenant_nombre,
      }}
    >
      {children}
      <InactivityGuard />
    </AppShell>
  );
}
