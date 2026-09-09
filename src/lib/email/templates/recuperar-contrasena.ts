export interface RecuperarContrasenaData {
  destinatarioNombre: string;
  actionLink:         string;
}

export function temaRecuperarContrasena(): string {
  return "🔑 Restablece tu contraseña de Lexia";
}

export function htmlRecuperarContrasena(data: RecuperarContrasenaData): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <tr><td style="background:#1e293b;padding:24px 32px;">
          <p style="margin:0;color:#94a3b8;font-size:12px;letter-spacing:.05em;text-transform:uppercase;">Lexia · Gestión Legal</p>
          <h1 style="margin:4px 0 0;color:#f8fafc;font-size:20px;font-weight:600;">Restablece tu contraseña</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 20px;color:#374151;font-size:15px;">
            Hola <strong>${data.destinatarioNombre}</strong>,<br>
            recibimos una solicitud para restablecer tu contraseña de Lexia.
            Haz clic en el enlace para elegir una nueva.
          </p>
          <a href="${data.actionLink}"
             style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
            Restablecer contraseña →
          </a>
          <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;">
            Este enlace expira en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo —
            tu contraseña actual seguirá funcionando.
          </p>
        </td></tr>
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
