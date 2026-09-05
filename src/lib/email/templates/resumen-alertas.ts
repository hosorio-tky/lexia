import { APP_URL } from "../client";

export interface ResumenAlertasItem {
  modulo:           "permisos" | "contratos";
  recursoNombre:    string;
  recursoId:        string;
  fechaVencimiento: string;
  diasRestantes:    number; // <= 0 significa ya vencido
}

export interface ResumenAlertasData {
  destinatarioNombre: string;
  items:              ResumenAlertasItem[];
}

export function temaResumenAlertas(data: ResumenAlertasData): string {
  const vencidos = data.items.filter((i) => i.diasRestantes <= 0).length;
  const proximos = data.items.length - vencidos;

  if (vencidos > 0 && proximos > 0) {
    return `📋 Resumen de alertas: ${vencidos} vencido${vencidos !== 1 ? "s" : ""}, ${proximos} próximo${proximos !== 1 ? "s" : ""} a vencer`;
  }
  if (vencidos > 0) {
    return `🔴 Resumen de alertas: ${vencidos} vencido${vencidos !== 1 ? "s" : ""}`;
  }
  return `⚠️ Resumen de alertas: ${proximos} próximo${proximos !== 1 ? "s" : ""} a vencer`;
}

function filaAlerta(item: ResumenAlertasItem): string {
  const tipo    = item.modulo === "permisos" ? "Permiso" : "Contrato";
  const url     = `${APP_URL}/${item.modulo}/${item.recursoId}`;
  const fecha   = new Date(item.fechaVencimiento).toLocaleDateString("es-SV", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const vencido = item.diasRestantes <= 0;
  const urgente = item.diasRestantes > 0 && item.diasRestantes <= 7;

  const txtColor = vencido ? "#991b1b" : urgente ? "#92400e" : "#166534";
  const badgeBg  = vencido ? "#991b1b" : urgente ? "#92400e" : "#166534";
  const badge    = vencido
    ? "VENCIDO"
    : `Vence en ${item.diasRestantes} día${item.diasRestantes !== 1 ? "s" : ""}`;

  return `
    <tr>
      <td style="padding:14px 20px;border-bottom:1px solid #f1f5f9;">
        <div style="display:inline-block;background:${badgeBg};color:#fff;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;border-radius:4px;margin-bottom:6px;">${badge}</div>
        <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#0f172a;">
          <a href="${url}" style="color:#0f172a;text-decoration:none;">${tipo}: ${item.recursoNombre}</a>
        </p>
        <p style="margin:0;font-size:12px;color:${txtColor};">Vencimiento: ${fecha}</p>
      </td>
    </tr>`;
}

export function htmlResumenAlertas(data: ResumenAlertasData): string {
  // Más urgente primero — vencidos (negativos/cero) antes que los próximos a vencer.
  const ordenados = [...data.items].sort((a, b) => a.diasRestantes - b.diasRestantes);
  const filas      = ordenados.map(filaAlerta).join("");
  const total      = data.items.length;

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
          <h1 style="margin:4px 0 0;color:#f8fafc;font-size:20px;font-weight:600;">Resumen de alertas de vencimiento</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 0 8px;">
          <p style="margin:0 32px 20px;color:#374151;font-size:15px;">
            Hola <strong>${data.destinatarioNombre}</strong>, tienes
            <strong>${total} ${total === 1 ? "registro" : "registros"}</strong> que requieren tu atención:
          </p>

          <table width="100%" style="border-top:1px solid #f1f5f9;">
            ${filas}
          </table>

          <div style="padding:24px 32px 8px;">
            <a href="${APP_URL}/notificaciones"
               style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
              Ver todas las alertas →
            </a>
          </div>
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
