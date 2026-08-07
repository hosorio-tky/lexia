"use client";

import { Suspense, useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function MfaChallengeInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const next         = searchParams.get("next") || "/permisos";
  const supabase     = createClient();

  const [factorId,    setFactorId]    = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code,        setCode]        = useState("");
  const [error,       setError]       = useState("");
  const [ready,       setReady]       = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const totp = data?.totp?.[0];
      if (!totp) { router.replace("/mfa/setup"); return; }
      setFactorId(totp.id);
      supabase.auth.mfa.challenge({ factorId: totp.id }).then(({ data: ch }) => {
        if (ch) { setChallengeId(ch.id); setReady(true); }
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = () => {
    if (!code || code.length !== 6) { setError("Ingresa el código de 6 dígitos"); return; }
    setError("");

    startTransition(async () => {
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
      if (vErr) {
        setError("Código incorrecto. Inténtalo de nuevo.");
        supabase.auth.mfa.challenge({ factorId }).then(({ data: ch }) => {
          if (ch) setChallengeId(ch.id);
        });
        return;
      }
      router.push(next);
      router.refresh();
    });
  };

  return (
    <Card className="p-6 shadow-sm space-y-5">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Verificación en dos pasos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ingresa el código de tu app de autenticación.
          </p>
        </div>
      </div>

      <Separator />

      {!ready && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {ready && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">Código de 6 dígitos</Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="text-center text-2xl tracking-[0.5em] font-mono"
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              autoFocus
            />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button className="w-full" onClick={handleVerify} disabled={code.length !== 6}>
            <KeyRound className="mr-2 h-4 w-4" />
            Verificar
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function MfaChallengePage() {
  return (
    <Suspense fallback={
      <Card className="p-6 shadow-sm flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    }>
      <MfaChallengeInner />
    </Suspense>
  );
}
