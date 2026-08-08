"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, Copy, Check, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function MfaSetupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [factorId,  setFactorId]  = useState("");
  const [qrCode,    setQrCode]    = useState("");
  const [secret,    setSecret]    = useState("");
  const [code,      setCode]      = useState("");
  const [error,     setError]     = useState("");
  const [copied,    setCopied]    = useState(false);
  const [step,      setStep]      = useState<"loading" | "enroll" | "verifying">("loading");
  const [, startTransition] = useTransition();
  const initRan = useRef(false);

  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;

    const init = async () => {
      // Borrar factores unverified via RPC con SECURITY DEFINER — accede a
      // auth.mfa_factors directamente en la DB sin exponer el service role key.
      await supabase.rpc("unenroll_pending_mfa_factors");

      // Limpiar también factores verified (no debería haber, pero por si acaso)
      const { data: factors } = await supabase.auth.mfa.listFactors();
      await Promise.all((factors?.totp ?? []).map((f) =>
        supabase.auth.mfa.unenroll({ factorId: f.id })
      ));

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `lexia-${crypto.randomUUID()}`,
      });
      if (error || !data) {
        setError(error?.message ?? "Error al iniciar configuración MFA");
        setStep("enroll");
        return;
      }
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setStep("enroll");
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = () => {
    if (!code || code.length !== 6) {
      setError("Ingresa el código de 6 dígitos");
      return;
    }
    setError("");
    setStep("verifying");

    startTransition(async () => {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
      if (cErr || !challenge) {
        setError(cErr?.message ?? "Error al crear desafío");
        setStep("enroll");
        return;
      }

      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });

      if (vErr) {
        setError("Código incorrecto. Verifica que tu app esté sincronizada.");
        setStep("enroll");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  };

  return (
    <Card className="p-6 shadow-sm space-y-5">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Activa la verificación en dos pasos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Requerida para acceder a Lexia. Protege tu cuenta ante accesos no autorizados.
          </p>
        </div>
      </div>

      <Separator />

      {/* Explicación + apps recomendadas */}
      <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Lexia maneja información legal y corporativa sensible. La verificación en dos pasos
          añade una capa extra de seguridad: aunque alguien obtenga tu contraseña, no podrá
          entrar sin el código de tu teléfono.
        </p>
        <div className="space-y-1.5">
          <p className="text-xs font-medium flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5" />
            Necesitas una app de autenticación en tu teléfono:
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 pl-5 list-disc">
            <li>
              <span className="font-medium text-foreground">Google Authenticator</span>
              {" — "}
              <a href="https://apps.apple.com/app/google-authenticator/id388497605" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">iOS</a>
              {" · "}
              <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Android</a>
            </li>
            <li>
              <span className="font-medium text-foreground">Authy</span>
              {" — "}
              <a href="https://apps.apple.com/app/authy/id494168017" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">iOS</a>
              {" · "}
              <a href="https://play.google.com/store/apps/details?id=com.authy.authy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Android</a>
              {" (permite respaldo en la nube)"}
            </li>
            <li>
              <span className="font-medium text-foreground">Microsoft Authenticator</span>
              {" — "}
              <a href="https://apps.apple.com/app/microsoft-authenticator/id983156458" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">iOS</a>
              {" · "}
              <a href="https://play.google.com/store/apps/details?id=com.azure.authenticator" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Android</a>
            </li>
          </ul>
        </div>
      </div>

      <Separator />

      {step === "loading" && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {(step === "enroll" || step === "verifying") && (
        <div className="space-y-5">
          {/* QR Code */}
          {qrCode && (
            <div className="flex flex-col items-center gap-3">
              <div
                className="rounded-xl border bg-white p-3"
                dangerouslySetInnerHTML={{ __html: qrCode }}
              />
              <p className="text-xs text-muted-foreground">
                O ingresa la clave manualmente:
              </p>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
                <code className="text-xs font-mono tracking-widest break-all">{secret}</code>
                <button
                  onClick={handleCopy}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition"
                  title="Copiar clave"
                >
                  {copied
                    ? <Check className="h-3.5 w-3.5 text-emerald-600" />
                    : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )}

          {/* Código de verificación */}
          <div className="space-y-1.5">
            <Label htmlFor="code">Código de verificación</Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="text-center text-lg tracking-widest font-mono"
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              disabled={step === "verifying"}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleVerify}
            disabled={step === "verifying" || code.length !== 6}
          >
            {step === "verifying"
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando…</>
              : <><ShieldCheck className="mr-2 h-4 w-4" />Activar autenticación en dos pasos</>}
          </Button>
        </div>
      )}
    </Card>
  );
}
