/**
 * Funciones de envío de email usando Resend.
 * Todas son fire-and-forget seguras — los errores se loguean sin romper el flujo.
 */
import { resend, EMAIL_FROM } from "./client";
import { temasTareaAsignada, htmlTareaAsignada, type TareaAsignadaData } from "./templates/tarea-asignada";
import { temaCambioEstado,   htmlCambioEstado,   type CambioEstadoData   } from "./templates/cambio-estado";
import { temaMencion,        htmlMencion,         type MencionData        } from "./templates/mencion";
import { temaAlertaVencimiento, htmlAlertaVencimiento, type AlertaVencimientoData } from "./templates/alerta-vencimiento";

async function send(to: string, subject: string, html: string): Promise<void> {
  const { error } = await resend.emails.send({
    from:    EMAIL_FROM,
    to,
    subject,
    html,
  });
  if (error) {
    console.error("[email] Error al enviar:", error);
  }
}

/** Notifica al usuario que le asignaron una tarea */
export async function sendTareaAsignada(
  toEmail: string,
  data: TareaAsignadaData
): Promise<void> {
  await send(toEmail, temasTareaAsignada(data), htmlTareaAsignada(data));
}

/** Notifica al responsable que cambiaron el estado de su permiso o contrato */
export async function sendCambioEstado(
  toEmail: string,
  data: CambioEstadoData
): Promise<void> {
  await send(toEmail, temaCambioEstado(data), htmlCambioEstado(data));
}

/** Notifica al usuario que fue @mencionado */
export async function sendMencion(
  toEmail: string,
  data: MencionData
): Promise<void> {
  await send(toEmail, temaMencion(data), htmlMencion(data));
}

/** Invitación para activar cuenta y establecer contraseña */
export async function sendInvitacion(
  toEmail: string,
  data: { destinatarioNombre: string; actionLink: string; invitadoPorNombre: string }
): Promise<void> {
  const { APP_URL } = await import("./client");
  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <tr><td style="background:#1e293b;padding:24px 32px;">
          <p style="margin:0;color:#94a3b8;font-size:12px;letter-spacing:.05em;text-transform:uppercase;">Lexia · Gestión Legal</p>
          <h1 style="margin:4px 0 0;color:#f8fafc;font-size:20px;font-weight:600;">Invitación a Lexia</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 20px;color:#374151;font-size:15px;">
            Hola <strong>${data.destinatarioNombre}</strong>,<br>
            <strong>${data.invitadoPorNombre}</strong> te ha invitado a unirte a <strong>Lexia</strong>.<br>
            Haz clic en el enlace para activar tu cuenta y establecer tu contraseña.
          </p>
          <a href="${data.actionLink}"
             style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
            Activar cuenta →
          </a>
          <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;">
            Este enlace expira en 24 horas. Si no solicitaste esta invitación, ignora este correo.
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
  await send(toEmail, `🔐 Activa tu cuenta en Lexia`, html);
}

/** Alerta de vencimiento próximo o ya vencido */
export async function sendAlertaVencimiento(
  toEmail: string,
  data: AlertaVencimientoData
): Promise<void> {
  await send(toEmail, temaAlertaVencimiento(data), htmlAlertaVencimiento(data));
}
