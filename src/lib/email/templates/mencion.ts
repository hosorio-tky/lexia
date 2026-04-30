import { APP_URL } from "../client";

export interface MencionData {
  destinatarioNombre: string;
  autorNombre:        string;
  modulo:             string;
  recursoNombre:      string;
  recursoId:          string;
  fragmento:          string;   // texto del comentario/nota (sin HTML)
  tipo:               "comentario" | "nota";
}

export function temaMencion(data: MencionData): string {
  return `💬 ${data.autorNombre} te mencionó en ${data.recursoNombre}`;
}

export function htmlMencion(data: MencionData): string {
  const moduloLabel: Record<string, string> = {
    permisos:  "Permiso",
    contratos: "Contrato",
    tareas:    "Tarea",
  };
  const label = moduloLabel[data.modulo] ?? data.modulo;
  const url   = `${APP_URL}/${data.modulo}/${data.recursoId}`;
  const tipoLabel = data.tipo === "comentario" ? "un comentario" : "una nota";

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
          <h1 style="margin:4px 0 0;color:#f8fafc;font-size:20px;font-weight:600;">Te mencionaron</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 20px;color:#374151;font-size:15px;">
            Hola <strong>${data.destinatarioNombre}</strong>,<br>
            <strong>${data.autorNombre}</strong> te mencionó en ${tipoLabel} del ${label} <strong>${data.recursoNombre}</strong>.
          </p>

          <!-- Fragmento -->
          <table width="100%" style="margin-bottom:24px;">
            <tr><td style="border-left:3px solid #6366f1;padding:12px 16px;background:#f8fafc;border-radius:0 8px 8px 0;">
              <p style="margin:0;font-size:14px;color:#374151;font-style:italic;">"${data.fragmento.slice(0, 300)}${data.fragmento.length > 300 ? "…" : ""}"</p>
            </td></tr>
          </table>

          <a href="${url}"
             style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
            Ver ${label.toLowerCase()} →
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
