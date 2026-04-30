import { APP_URL } from "../client";

export interface AlertaVencimientoData {
  destinatarioNombre: string;
  modulo:             "permisos" | "contratos";
  recursoNombre:      string;
  recursoId:          string;
  fechaVencimiento:   string;
  diasRestantes:      number;
}

export function temaAlertaVencimiento(data: AlertaVencimientoData): string {
  const tipo = data.modulo === "permisos" ? "Permiso" : "Contrato";
  if (data.diasRestantes <= 0) {
    return `🔴 ${tipo} vencido: ${data.recursoNombre}`;
  }
  return `⚠️ ${tipo} vence en ${data.diasRestantes} día${data.diasRestantes !== 1 ? "s" : ""}: ${data.recursoNombre}`;
}

export function htmlAlertaVencimiento(data: AlertaVencimientoData): string {
  const tipo  = data.modulo === "permisos" ? "permiso" : "contrato";
  const Tipo  = tipo.charAt(0).toUpperCase() + tipo.slice(1);
  const url   = `${APP_URL}/${data.modulo}/${data.recursoId}`;
  const fecha = new Date(data.fechaVencimiento).toLocaleDateString("es-SV", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const urgente  = data.diasRestantes <= 7;
  const vencido  = data.diasRestantes <= 0;
  const bgColor  = vencido ? "#fef2f2" : urgente ? "#fffbeb" : "#f0fdf4";
  const txtColor = vencido ? "#991b1b"  : urgente ? "#92400e"  : "#166534";
  const badge    = vencido
    ? "VENCIDO"
    : `Vence en ${data.diasRestantes} día${data.diasRestantes !== 1 ? "s" : ""}`;

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
          <h1 style="margin:4px 0 0;color:#f8fafc;font-size:20px;font-weight:600;">Alerta de vencimiento — ${Tipo}</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 20px;color:#374151;font-size:15px;">
            Hola <strong>${data.destinatarioNombre}</strong>,<br>
            te informamos sobre el siguiente ${tipo} que requiere atención.
          </p>

          <!-- Alerta card -->
          <table width="100%" style="background:${bgColor};border-radius:8px;margin-bottom:24px;">
            <tr><td style="padding:20px;">
              <div style="display:inline-block;background:${txtColor};color:#fff;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 10px;border-radius:4px;margin-bottom:12px;">${badge}</div>
              <p style="margin:0 0 8px;font-size:17px;font-weight:600;color:#0f172a;">${data.recursoNombre}</p>
              <p style="margin:0;font-size:14px;color:${txtColor};font-weight:600;">Fecha de vencimiento: ${fecha}</p>
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
