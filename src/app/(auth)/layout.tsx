import { Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-background flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-2 ring-primary/20">
          <Sparkles className="h-7 w-7" />
        </div>
        <div className="text-center">
          <div className="text-xl font-bold tracking-tight">Lexia</div>
          <div className="text-sm text-muted-foreground">Gestión Legal Corporativa</div>
        </div>
      </div>

      {/* Contenido del formulario */}
      <div className="w-full max-w-sm">
        {children}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Lexia. Todos los derechos reservados.
      </p>
    </div>
  );
}
