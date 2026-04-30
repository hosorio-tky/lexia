import { APP_URL } from "../client";

export interface TareaAsignadaData {
  destinatarioNombre: string;
  asignadoPorNombre:  string;
  tituloTarea:        string;
  descripcion?:       string | null;
  prioridad:          string;
  fechaLimite?:       string | null;
  moduloOrigen?:      string | null;
  recursoDesc?:       string | null;
  tareaId:            string;
}

export function temasTareaAsignada(data: TareaAsignadaData): string {
  return `📋 Nueva tarea asignada: ${data.tituloTarea}`;
}

export function htmlTareaAsignada(data: TareaAsignadaData): string {
  const limite = data.fechaLimite
    ? new Date(data.fechaLimite).toLocaleDateString("es-SV", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  const prioridadColor: Record<string, string> = {
    urgente: "#ef4444",
    alta:    "#f97316",
    media:   "#eab308",
    baja:    "#22c55e",
  };
  const color = prioridadColor[data.prioridad] ?? "#6b7280";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">

        <!-- Header -->
        <tr><td style="background:#1e293b;padding:24px 32px;">
          <p style="margin:0;color:#94a3b8;font-size:12px;letter-spacing:.05em;text-transform:uppercase;">Lexia · Gestión Legal</p>
          <h1 style="margin:4px 0 0;color:#f8fafc;font-size:20px;font-weight:600;">Nueva tarea asignada</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 20px;color:#374151;font-size:15px;">
            Hola <strong>${data.destinatarioNombre}</strong>,<br>
            <strong>${data.asignadoPorNombre}</strong> te ha asignado una nueva tarea.
          </p>

          <!-- Tarea card -->
          <table width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
            <tr><td style="padding:20px;">
              <p style="margin:0 0 12px;font-size:17px;font-weight:600;color:#0f172a;">${data.tituloTarea}</p>
              ${data.descripcion ? `<p style="margin:0 0 16px;color:#64748b;font-size:14px;">${data.descripcion}</p>` : ""}
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:20px;">
                    <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Prioridad</p>
                    <p style="margin:2px 0 0;font-size:13px;font-weight:600;color:${color};">${data.prioridad.charAt(0).toUpperCase() + data.prioridad.slice(1)}</p>
                  </td>
                  ${limite ? `<td style="padding-right:20px;">
                    <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Fecha límite</p>
                    <p style="margin:2px 0 0;font-size:13px;font-weight:600;color:#0f172a;">${limite}</p>
                  </td>` : ""}
                  ${data.recursoDesc ? `<td>
                    <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Relacionada con</p>
                    <p style="margin:2px 0 0;font-size:13px;font-weight:600;color:#0f172a;">${data.recursoDesc}</p>
                  </td>` : ""}
                </tr>
              </table>
            </td></tr>
          </table>

          <a href="${APP_URL}/tareas/${data.tareaId}"
             style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
            Ver tarea →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #f1f5f9;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
            Lexia · Plataforma de gestión de cumplimiento legal
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
