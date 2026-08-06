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

/** Genera embeddings para múltiples textos, procesando en lotes para no superar el límite de 300k tokens */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const BATCH_SIZE = 100;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch.map((t) => t.replace(/\n/g, " ").slice(0, 8000)),
    });
    results.push(...response.data.map((d) => d.embedding));
  }

  return results;
}
