import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { extractText } from "@/lib/ai/document-processor";
import { extraerCamposContrato, textoAHtml } from "@/lib/ai/contrato-extractor";

export const maxDuration = 60;

const BUCKET = "documentos";
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "El archivo excede el límite de 20 MB" }, { status: 413 });
    }

    const mimeType = file.type || "application/pdf";
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (!allowedTypes.includes(mimeType)) {
      return NextResponse.json({ error: "Solo se aceptan archivos PDF o DOCX" }, { status: 415 });
    }

    const buffer = await file.arrayBuffer();

    // 1. Subir a Storage
    const ext         = mimeType === "application/pdf" ? "pdf" : "docx";
    const uuid        = crypto.randomUUID();
    const storagePath = `${session.tenant_id}/contratos/${uuid}.${ext}`;

    const client = createAdminClient();
    const { error: uploadError } = await client.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

    if (uploadError) {
      return NextResponse.json(
        { error: `Error al subir el archivo: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 2. Extraer texto
    const texto = await extractText(buffer, mimeType);
    if (!texto || texto.trim().length < 50) {
      // Subida exitosa pero sin texto legible — devolver solo el path
      return NextResponse.json({ storage_path: storagePath, fields: {}, contenido_html: "" });
    }

    // 3. Extraer campos con IA y convertir a HTML (en paralelo)
    const [fields, contenido_html] = await Promise.all([
      extraerCamposContrato(texto),
      Promise.resolve(textoAHtml(texto)),
    ]);

    return NextResponse.json({ storage_path: storagePath, fields, contenido_html });
  } catch (err) {
    console.error("[contratos/extract]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
