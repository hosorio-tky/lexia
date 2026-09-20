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
  // El rastreador de archivos de Vercel (nft) solo detecta módulos importados
  // estáticamente — no ve los binarios .wasm/cmaps/fuentes de pdfjs-dist,
  // porque se leen con una ruta armada en tiempo de ejecución (fs.readFile).
  // Sin esto, quedan fuera del deploy y la extracción con visión de PDFs
  // escaneados falla en producción aunque funcione perfecto en local.
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/pdfjs-dist/wasm/**",
      "./node_modules/pdfjs-dist/cmaps/**",
      "./node_modules/pdfjs-dist/standard_fonts/**",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
