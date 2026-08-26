import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const getEnv = (k) => env.match(new RegExp(`^${k}=(.+)`, "m"))?.[1];

const SUPABASE_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY  = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const OPENAI_KEY   = getEnv("OPENAI_API_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const openai   = new OpenAI({ apiKey: OPENAI_KEY });

const TENANT_ID = "8edff51b-aeff-4e1c-a083-6f6ed6335c59";
const query = "Dame un resumen del Diario Oficial del 1 de julio de 2026";

const res = await openai.embeddings.create({ model: "text-embedding-3-small", input: query });
const embStr = JSON.stringify(res.data[0].embedding);

const { data, error } = await supabase.rpc("match_lexbase_chunks", {
  p_tenant_id:   TENANT_ID,
  p_embedding:   embStr,
  p_match_count: 8,
  p_threshold:   0.0,
});

console.log("Error:", error?.message ?? "none");
console.log("Total chunks returned:", data?.length ?? 0);
console.log("\n--- Context the AI would receive ---\n");
(data ?? []).forEach((r, i) => {
  console.log(`[Lexbase legal — fragmento ${i+1}, relevancia ${(r.similarity*100).toFixed(0)}%]`);
  console.log(`[${r.documento_titulo}]`);
  console.log(r.contenido?.slice(0, 200));
  console.log("---");
});
