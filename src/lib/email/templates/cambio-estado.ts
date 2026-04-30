import { APP_URL } from "../client";

export interface CambioEstadoData {
  destinatarioNombre: string;
  modulo:             "permisos" | "contratos";
  recursoNombre:      string;
  estadoAnterior:     string;
  estadoNuevo:        string;
  cambiadoPorNombre:  string;
  comentario?:        string | null;
  recursoId:          string;
}

export function temaCambioEstado(data: CambioEstadoData): string {
  const tipo = data.modulo === "permisos" ? "Permiso" : "Contrato";
  return `🔄 ${tipo} actualizado: ${data.recursoNombre} → ${data.estadoNuevo}`;
}

export function htmlCambioEstado(data: CambioEstadoData): string {
  const tipo    = data.modulo === "permisos" ? "permiso" : "contrato";
  const Tipo    = tipo.charAt(0).toUpperCase() + tipo.slice(1);
  const url     = `${APP_URL}/${data.modulo}/${data.recursoId}`;

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
          <h1 style="margin:4px 0 0;color:#f8fafc;font-size:20px;font-weight:600;">Cambio de estado — ${Tipo}</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 20px;color:#374151;font-size:15px;">
            Hola <strong>${data.destinatarioNombre}</strong>,<br>
            <strong>${data.cambiadoPorNombre}</strong> actualizó el estado del ${tipo} <strong>${data.recursoNombre}</strong>.
          </p>

          <!-- Estado card -->
          <table width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
            <tr><td style="padding:20px;">
              <p style="margin:0 0 16px;font-size:17px;font-weight:600;color:#0f172a;">${data.recursoNombre}</p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="text-align:center;background:#fee2e2;border-radius:6px;padding:12px 16px;">
                    <p style="margin:0;font-size:11px;color:#991b1b;text-transform:uppercase;letter-spacing:.05em;">Estado anterior</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#7f1d1d;">${data.estadoAnterior}</p>
                  </td>
                  <td style="text-align:center;padding:0 12px;color:#94a3b8;font-size:20px;">→</td>
                  <td style="text-align:center;background:#dcfce7;border-radius:6px;padding:12px 16px;">
                    <p style="margin:0;font-size:11px;color:#166534;text-transform:uppercase;letter-spacing:.05em;">Estado nuevo</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#14532d;">${data.estadoNuevo}</p>
                  </td>
                </tr>
              </table>
              ${data.comentario ? `<p style="margin:16px 0 0;padding:12px;background:#fff;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;color:#475569;font-style:italic;">"${data.comentario}"</p>` : ""}
            </td></tr>
          </table>

          <a href="${url}"
             style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
            Ver ${tipo} →
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
