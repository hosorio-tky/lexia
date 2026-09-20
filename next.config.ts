import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse y mammoth usan require() dinámico con acceso a filesystem;
  // deben quedar fuera del bundle de webpack para funcionar en Vercel serverless.
  // @napi-rs/canvas es un binario nativo (.node) — Turbopack no puede
  // empaquetarlo como asset de ESM, así que también debe quedar externo.
  // pdfjs-dist se usa directamente (no solo vía unpdf) para renderizar
  // páginas con soporte real de JBIG2 — necesita quedar externo para que
  // sus rutas relativas a wasm/cmaps/standard_fonts sigan resolviendo bien
  // en el sistema de archivos real en producción.
  serverExternalPackages: ["pdf-parse", "mammoth", "unpdf", "pdfjs-dist", "@napi-rs/canvas"],
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
