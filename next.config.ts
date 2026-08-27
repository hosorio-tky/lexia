import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse y mammoth usan require() dinámico con acceso a filesystem;
  // deben quedar fuera del bundle de webpack para funcionar en Vercel serverless.
  serverExternalPackages: ["pdf-parse", "mammoth"],
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
