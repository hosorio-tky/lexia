import Image from "next/image";
import { Scale, ShieldCheck, FileText } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh flex">
      {/* ── Panel izquierdo ── */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(221 60% 18%) 0%, hsl(221 70% 28%) 60%, hsl(230 65% 35%) 100%)" }}>

        {/* Círculos decorativos de fondo */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(221 83% 70%), transparent)" }} />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(230 83% 70%), transparent)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, white, transparent)" }} />

        {/* Logo */}
        <div className="relative z-10">
          <Image src="/logo_lexia.png" alt="Lexia" width={130} height={44} className="object-contain brightness-0 invert" priority />
        </div>

        {/* Tagline central */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <h2 className="text-4xl font-bold text-white leading-tight">
              Gestión legal<br />corporativa inteligente
            </h2>
            <p className="text-base text-white/60 leading-relaxed max-w-sm">
              Centraliza permisos, contratos y cumplimiento normativo en una sola plataforma segura.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3 pt-2">
            {[
              { icon: FileText,    text: "Control de permisos y contratos" },
              { icon: ShieldCheck, text: "Alertas de vencimiento automáticas" },
              { icon: Scale,       text: "Trazabilidad y auditoría completa" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4 text-white/80" />
                </div>
                <span className="text-sm text-white/70">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer izquierdo */}
        <p className="relative z-10 text-xs text-white/30">
          © {new Date().getFullYear()} Lexia. Todos los derechos reservados.
        </p>
      </div>

      {/* ── Panel derecho (formulario) ── */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 lg:p-12 bg-background">
        {/* Logo mobile */}
        <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
          <Image src="/logo_lexia.png" alt="Lexia" width={110} height={38} className="object-contain dark:invert" priority />
          <p className="text-sm text-muted-foreground">Gestión Legal Corporativa</p>
        </div>

        <div className="w-full max-w-sm">
          {children}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground lg:hidden">
          © {new Date().getFullYear()} Lexia. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
