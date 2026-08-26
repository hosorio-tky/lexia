"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, Copy, Check, Loader2, Smartphone, ArrowRight, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function MfaSetupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [factorId,      setFactorId]      = useState("");
  const [qrCode,        setQrCode]        = useState("");
  const [secret,        setSecret]        = useState("");
  const [code,          setCode]          = useState("");
  const [error,         setError]         = useState("");
  const [copied,        setCopied]        = useState(false);
  const [appConfirmed,  setAppConfirmed]  = useState(false);
  const [step,          setStep]          = useState<"loading" | "enroll" | "verifying">("loading");
  const [, startTransition] = useTransition();
  const initRan = useRef(false);

  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;

    const init = async () => {
      await supabase.rpc("unenroll_pending_mfa_factors");

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
      {/* Header */}
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

      {/* Loading */}
      {step === "loading" && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {(step === "enroll" || step === "verifying") && (
        <>
          {/* ── Paso 1: Descargar la app ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${appConfirmed ? "bg-emerald-100 text-emerald-700" : "bg-primary text-primary-foreground"}`}>
                {appConfirmed ? <Check className="h-3.5 w-3.5" /> : "1"}
              </span>
              <span className={`text-sm font-medium ${appConfirmed ? "text-muted-foreground line-through" : ""}`}>
                Descarga una app de autenticación
              </span>
            </div>

            {!appConfirmed && (
              <div className="ml-8 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Necesitas una de estas apps en tu teléfono. Es gratuita y solo la usarás para generar códigos de acceso.
                </p>
                <ul className="text-sm space-y-2">
                  {[
                    { name: "Google Authenticator", ios: "https://apps.apple.com/app/google-authenticator/id388497605", android: "https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" },
                    { name: "Authy", note: "(permite respaldo en la nube)", ios: "https://apps.apple.com/app/authy/id494168017", android: "https://play.google.com/store/apps/details?id=com.authy.authy" },
                    { name: "Microsoft Authenticator", ios: "https://apps.apple.com/app/microsoft-authenticator/id983156458", android: "https://play.google.com/store/apps/details?id=com.azure.authenticator" },
                  ].map(({ name, note, ios, android }) => (
                    <li key={name} className="flex items-start gap-2">
                      <Smartphone className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <span>
                        <span className="font-medium">{name}</span>
                        {note && <span className="text-muted-foreground text-xs"> {note}</span>}
                        {" — "}
                        <a href={ios} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline text-xs">iOS</a>
                        {" · "}
                        <a href={android} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline text-xs">Android</a>
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full mt-2"
                  onClick={() => setAppConfirmed(true)}
                >
                  Ya tengo la app instalada
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* ── Paso 2: Escanear el QR ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${!appConfirmed ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
                2
              </span>
              <span className={`text-sm font-medium ${!appConfirmed ? "text-muted-foreground" : ""}`}>
                Escanea el código QR con tu app
              </span>
            </div>

            {appConfirmed && (
              <div className="ml-8 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Abre la app, toca <strong>Agregar cuenta</strong> o el ícono <strong>+</strong>, y escanea este código:
                </p>

                {qrCode ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="rounded-xl border bg-white p-3">
                      <img src={qrCode} alt="Código QR para configurar autenticación" width={200} height={200} />
                    </div>
                    <div className="w-full space-y-1">
                      <p className="text-xs text-center text-muted-foreground">¿No puedes escanear? Ingresa la clave manualmente:</p>
                      <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
                        <code className="text-xs font-mono tracking-widest break-all flex-1">{secret}</code>
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
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-6 rounded-xl border bg-muted/30">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <QrCode className="h-8 w-8" />
                      <span className="text-xs">Generando código…</span>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Verificación */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="code">Ingresa el código de 6 dígitos que muestra tu app</Label>
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
                      autoFocus
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
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
