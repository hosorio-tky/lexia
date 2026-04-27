import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PERMISOS_MATRIZ, type PermisoRol } from "@/types/settings";
import { ROLE_LABELS, ROLE_COLORS } from "@/types/users";

const ROLES = ["admin", "supervisor", "usuario", "solo_lectura"] as const;

function Check({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600" />
  ) : (
    <XCircle className="mx-auto h-4 w-4 text-muted-foreground/30" />
  );
}

export function RolesMatrix() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Roles y permisos</h2>
        <p className="text-sm text-muted-foreground">
          Matriz de lo que puede hacer cada rol en el sistema.
        </p>
      </div>

      {/* Chips de roles */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map((rol) => (
          <div
            key={rol}
            className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-sm"
          >
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs font-semibold leading-tight">
                {ROLE_LABELS[rol]}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight capitalize">
                {rol}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Matriz por grupo */}
      <div className="space-y-4">
        {PERMISOS_MATRIZ.map((grupo) => (
          <Card key={grupo.grupo} className="overflow-hidden">
            <div className="bg-muted/40 px-4 py-2.5 border-b">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {grupo.grupo}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium w-1/2">
                      Acción
                    </th>
                    {ROLES.map((rol) => (
                      <th key={rol} className="px-3 py-2 text-center font-medium whitespace-nowrap">
                        {ROLE_LABELS[rol]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grupo.items.map((item, idx) => (
                    <tr
                      key={item.accion}
                      className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium leading-tight">{item.accion}</p>
                        <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                          {item.descripcion}
                        </p>
                      </td>
                      {ROLES.map((rol) => (
                        <td key={rol} className="px-3 py-3 text-center">
                          <Check ok={item[rol as keyof PermisoRol] as boolean} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">Nota:</strong> Los roles son fijos
        en el sistema. La asignación de rol por usuario se gestiona desde
        la sección <strong className="text-foreground">Usuarios</strong>.
      </div>
    </div>
  );
}
