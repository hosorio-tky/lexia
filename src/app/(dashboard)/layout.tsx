import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InactivityGuard } from "@/components/shared/inactivity-guard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <>
      {children}
      <InactivityGuard />
    </>
  );
}
