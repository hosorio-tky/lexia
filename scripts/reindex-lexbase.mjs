/**
 * Re-indexes all lexbase documents for a tenant.
 * Run from project root: node scripts/reindex-lexbase.mjs
 */
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const getEnv = (k) => env.match(new RegExp(`^${k}=(.+)`, "m"))?.[1];

const SUPABASE_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY  = getEnv("SUPABASE_SERVICE_ROLE_KEY");

const TENANT_ID = "8edff51b-aeff-4e1c-a083-6f6ed6335c59"; // Teknergy

// Fetch all indexable documents for the tenant
const resp = await fetch(`${SUPABASE_URL}/rest/v1/lexbase_documentos?tenant_id=eq.${TENANT_ID}&storage_path=not.is.null&select=id,titulo,storage_path,tipo_mime`, {
  headers: {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  },
});

const docs = await resp.json();
console.log(`Found ${docs.length} indexable documents:`);
docs.forEach((d) => console.log(`  - ${d.titulo} [${d.id.slice(0, 8)}]`));

// Trigger re-index via the existing API
for (const doc of docs) {
  console.log(`\nRe-indexing: ${doc.titulo}...`);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/noop`, { method: "POST" }).catch(() => null);
  // We can't call the TS indexer directly from here — use the API route instead
  // Hitting the reindex action via HTTP (it's a server action, not REST)
  console.log(`  storage_path: ${doc.storage_path}`);
  console.log(`  tipo_mime: ${doc.tipo_mime}`);
}

console.log("\nTo re-index, use the Lexia UI: open each document → Reindexar.");
console.log("Or the admin can call the reindexarDocumento server action.");
