import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Guard de autenticación para todas las rutas del dashboard.
 * No renderiza AppShell aquí — cada página lo hace con sus propios
 * breadcrumb/title usando getSession() (deduplicado con React cache).
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <>{children}</>;
}
