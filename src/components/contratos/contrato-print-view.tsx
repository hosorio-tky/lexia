"use client";

import { useEffect } from "react";
import type { Contrato } from "@/types/contratos";

function fmt(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-SV", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function fmtValor(valor?: number | null, moneda?: string | null) {
  if (valor == null) return null;
  return new Intl.NumberFormat("es-SV", {
    style: "currency", currency: moneda ?? "USD", minimumFractionDigits: 2,
  }).format(valor);
}

export function ContratoPrintView({ contrato }: { contrato: Contrato }) {
  useEffect(() => {
    document.title = contrato.titulo;
    window.print();
  }, [contrato.titulo]);

  const valorFmt = fmtValor(contrato.valor, contrato.moneda);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: "Times New Roman", Times, serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #000;
          background: #fff;
        }

        .page {
          width: 21cm;
          min-height: 29.7cm;
          margin: 0 auto;
          padding: 2.5cm 2.8cm;
        }

        /* ── Encabezado ── */
        .header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          padding-bottom: 0.8rem;
          border-bottom: 2px solid #000;
          margin-bottom: 1.4rem;
        }
        .header-brand { font-size: 13pt; font-weight: bold; letter-spacing: 0.02em; }
        .header-meta  { text-align: right; font-size: 9pt; color: #444; line-height: 1.5; }

        /* ── Título del contrato ── */
        .contract-title {
          text-align: center;
          font-size: 13pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 0.4rem;
        }
        .contract-numero {
          text-align: center;
          font-size: 10pt;
          color: #444;
          margin-bottom: 1.4rem;
        }

        /* ── Ficha de datos ── */
        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.3rem 2rem;
          padding: 0.8rem 1rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          background: #f9f9f9;
          margin-bottom: 1.4rem;
          font-size: 9.5pt;
        }
        .meta-row { display: flex; gap: 0.4rem; }
        .meta-label { color: #555; white-space: nowrap; }
        .meta-value { font-weight: bold; }

        /* ── Separador ── */
        .divider {
          border: none;
          border-top: 1px solid #ccc;
          margin: 1.2rem 0;
        }

        /* ── Contenido del contrato ── */
        .content { font-size: 10.5pt; line-height: 1.7; }

        .content p  { margin-bottom: 0.7rem; text-align: justify; }
        .content ol,
        .content ul { margin: 0.4rem 0 0.7rem 1.4rem; }
        .content li { margin-bottom: 0.25rem; }
        .content strong { font-weight: bold; }
        .content em     { font-style: italic; }

        /* ── Sin contenido ── */
        .no-content {
          padding: 2rem;
          text-align: center;
          color: #888;
          border: 1px dashed #ccc;
          border-radius: 4px;
          font-size: 10pt;
          font-style: italic;
        }

        /* ── Pie de página ── */
        .footer {
          margin-top: 3rem;
          padding-top: 0.6rem;
          border-top: 1px solid #ccc;
          font-size: 8.5pt;
          color: #777;
          display: flex;
          justify-content: space-between;
        }

        /* ── Pantalla: botón flotante ── */
        .print-bar {
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          display: flex;
          gap: 0.6rem;
          z-index: 100;
        }
        .btn {
          padding: 0.5rem 1.1rem;
          border-radius: 6px;
          font-family: system-ui, sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .btn-primary { background: #4f46e5; color: #fff; }
        .btn-primary:hover { background: #4338ca; }
        .btn-ghost  { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
        .btn-ghost:hover { background: #e5e7eb; }

        /* ── Impresión ── */
        @media print {
          body { background: white; }
          .page { padding: 1.8cm 2.2cm; margin: 0; width: 100%; }
          .print-bar { display: none !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      {/* Barra de acciones (solo en pantalla) */}
      <div className="print-bar">
        <button className="btn btn-ghost" onClick={() => window.close()}>
          ✕ Cerrar
        </button>
        <button className="btn btn-primary" onClick={() => window.print()}>
          🖨 Imprimir / Guardar PDF
        </button>
      </div>

      <div className="page">
        {/* Encabezado */}
        <div className="header">
          <div className="header-brand">LEXIA</div>
          <div className="header-meta">
            {contrato.numero && <div><strong>Ref:</strong> {contrato.numero}</div>}
            <div><strong>Estado:</strong> {contrato.estado}</div>
            <div><strong>Generado:</strong> {new Date().toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric" })}</div>
          </div>
        </div>

        {/* Título */}
        <div className="contract-title">{contrato.titulo}</div>
        {contrato.numero && (
          <div className="contract-numero">Contrato N° {contrato.numero}</div>
        )}

        {/* Ficha de datos */}
        <div className="meta-grid">
          {contrato.tipo && (
            <div className="meta-row">
              <span className="meta-label">Tipo:</span>
              <span className="meta-value">{contrato.tipo}</span>
            </div>
          )}
          {contrato.responsable_nombre && (
            <div className="meta-row">
              <span className="meta-label">Responsable:</span>
              <span className="meta-value">{contrato.responsable_nombre}</span>
            </div>
          )}
          {contrato.contraparte_nombre && (
            <div className="meta-row">
              <span className="meta-label">Contraparte:</span>
              <span className="meta-value">{contrato.contraparte_nombre}</span>
            </div>
          )}
          {contrato.contraparte_email && (
            <div className="meta-row">
              <span className="meta-label">Email contraparte:</span>
              <span className="meta-value">{contrato.contraparte_email}</span>
            </div>
          )}
          {valorFmt && (
            <div className="meta-row">
              <span className="meta-label">Valor:</span>
              <span className="meta-value">{valorFmt}</span>
            </div>
          )}
          {contrato.fecha_firma && (
            <div className="meta-row">
              <span className="meta-label">Fecha de firma:</span>
              <span className="meta-value">{fmt(contrato.fecha_firma)}</span>
            </div>
          )}
          {contrato.fecha_inicio && (
            <div className="meta-row">
              <span className="meta-label">Fecha de inicio:</span>
              <span className="meta-value">{fmt(contrato.fecha_inicio)}</span>
            </div>
          )}
          {contrato.fecha_fin && (
            <div className="meta-row">
              <span className="meta-label">Fecha de vencimiento:</span>
              <span className="meta-value">{fmt(contrato.fecha_fin)}</span>
            </div>
          )}
        </div>

        {contrato.descripcion && (
          <>
            <hr className="divider" />
            <p className="content" style={{ marginBottom: "1.2rem" }}>
              <strong>Descripción: </strong>{contrato.descripcion}
            </p>
          </>
        )}

        <hr className="divider" />

        {/* Contenido HTML del contrato */}
        {contrato.contenido_html ? (
          <div
            className="content"
            dangerouslySetInnerHTML={{ __html: contrato.contenido_html }}
          />
        ) : (
          <div className="no-content">
            Este contrato no tiene contenido textual registrado.
          </div>
        )}

        {/* Pie */}
        <div className="footer">
          <span>Lexia — Gestión Legal Corporativa</span>
          <span>Documento generado automáticamente · No válido sin firma autorizada</span>
        </div>
      </div>
    </>
  );
}
