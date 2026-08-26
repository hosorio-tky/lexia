import { ReportesClient } from "@/components/reportes/reportes-client";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ReportesPage() {
  const session = await getSession();

  return (
        <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
      </div>
      <ReportesClient />
    </>
  );
}
