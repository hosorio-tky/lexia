import type { Metadata } from "next";
import { Inter } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Lexia — Gestión Legal Corporativa",
  description: "Plataforma para gestionar permisos, contratos, marcas y cumplimiento regulatorio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-background text-foreground antialiased">
        <NextTopLoader color="hsl(221 83% 53%)" height={3} showSpinner={false} />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
