import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse y mammoth usan require() dinámico con acceso a filesystem;
  // deben quedar fuera del bundle de webpack para funcionar en Vercel serverless.
  // @napi-rs/canvas es un binario nativo (.node) — Turbopack no puede
  // empaquetarlo como asset de ESM, así que también debe quedar externo.
  serverExternalPackages: ["pdf-parse", "mammoth", "unpdf", "@napi-rs/canvas"],
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
