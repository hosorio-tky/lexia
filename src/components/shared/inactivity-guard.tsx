"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

const TIMEOUT_MS    = 120 * 60 * 1000; // 120 minutos
const WARNING_MS    =   2 * 60 * 1000; //   2 minutos antes del cierre
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

export function InactivityGuard() {
  const router          = useRouter();
  const timeoutRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showWarning,   setShowWarning]   = useState(false);
  const [countdown,     setCountdown]     = useState(120); // segundos
  const countdownRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAll = useCallback(() => {
    if (timeoutRef.current)   clearTimeout(timeoutRef.current);
    if (warningRef.current)   clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const doLogout = useCallback(async () => {
    clearAll();
    setShowWarning(false);
    await signOut();
    router.push("/login");
  }, [clearAll, router]);

  const startCountdown = useCallback(() => {
    setCountdown(120);
    setShowWarning(true);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const resetTimer = useCallback(() => {
    if (showWarning) return; // si ya se mostró el aviso, no reiniciar
    clearAll();

    warningRef.current = setTimeout(() => {
      startCountdown();
      // Cierre definitivo después de que termine el countdown
      timeoutRef.current = setTimeout(doLogout, WARNING_MS);
    }, TIMEOUT_MS - WARNING_MS);
  }, [clearAll, doLogout, showWarning, startCountdown]);

  const handleContinue = useCallback(() => {
    clearAll();
    setShowWarning(false);
    // Reiniciar desde cero
    warningRef.current = setTimeout(() => {
      startCountdown();
      timeoutRef.current = setTimeout(doLogout, WARNING_MS);
    }, TIMEOUT_MS - WARNING_MS);
  }, [clearAll, doLogout, startCountdown]);

  useEffect(() => {
    resetTimer();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    return () => {
      clearAll();
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cerrar sesión cuando el countdown llegue a 0
  useEffect(() => {
    if (countdown === 0) doLogout();
  }, [countdown, doLogout]);

  const mm = String(Math.floor(countdown / 60)).padStart(2, "0");
  const ss = String(countdown % 60).padStart(2, "0");

  return (
    <AlertDialog open={showWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Sigues ahí?</AlertDialogTitle>
          <AlertDialogDescription>
            Tu sesión cerrará por inactividad en{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {mm}:{ss}
            </span>
            . ¿Deseas continuar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={doLogout}>
            Cerrar sesión
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleContinue}>
            Continuar sesión
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
