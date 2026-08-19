import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { extractText } from "@/lib/ai/document-processor";
import { extraerMetadatosLexbase } from "@/lib/ai/lexbase-extractor";

export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
];

export async function POST(req: NextRequest) {
  try {
    await getSession(); // verifica autenticación

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "El archivo excede el límite de 20 MB" }, { status: 413 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Solo se aceptan archivos PDF, DOCX o TXT" }, { status: 415 });
    }

    const buffer = await file.arrayBuffer();
    const texto  = await extractText(buffer, file.type);

    if (!texto || texto.trim().length < 50) {
      return NextResponse.json({ fields: {} });
    }

    const fields = await extraerMetadatosLexbase(texto);
    return NextResponse.json({ fields });
  } catch (err) {
    console.error("[lexbase/extract]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
