import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Genera un embedding de 1536 dimensiones para un texto */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.replace(/\n/g, " ").slice(0, 8000), // límite seguro
  });
  return response.data[0].embedding;
}

/** Genera embeddings para múltiples textos en una sola llamada (más eficiente) */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts.map((t) => t.replace(/\n/g, " ").slice(0, 8000)),
  });
  return response.data.map((d) => d.embedding);
}
