"use client";

import { createContext, useContext, useState, useEffect, useRef, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  obtenerNotificacionesRecientes,
  marcarComoLeida,
  marcarTodosComoLeidos,
  eliminarNotificacion,
} from "@/app/actions/notificaciones";
import type { Notificacion } from "@/types/notifications";

interface NotificationsContextValue {
  notifs: Notificacion[];
  unreadCount: number;
  loaded: boolean;
  handleRead: (id: string) => void;
  handleDelete: (id: string) => void;
  handleMarkAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifs, setNotifs]     = useState<Notificacion[]>([]);
  const [loaded, setLoaded]     = useState(false);
  const [, startTransition]     = useTransition();
  const channelRef              = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  const unreadCount = notifs.filter((n) => !n.leida).length;

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    obtenerNotificacionesRecientes().then((data) => {
      if (!cancelled) { setNotifs(data); setLoaded(true); }
    });

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const userId = data.user?.id;
      if (!userId) return;

      const channel = supabase
        .channel(`notificaciones:${userId}`)
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "notificaciones",
          filter: `user_id=eq.${userId}`,
        }, (payload) => {
          setNotifs((prev) => [payload.new as Notificacion, ...prev]);
        })
        .subscribe();

      channelRef.current = channel;
    });

    return () => {
      cancelled = true;
      if (channelRef.current) {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  function handleRead(id: string) {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    startTransition(() => marcarComoLeida(id));
  }

  function handleDelete(id: string) {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    startTransition(() => eliminarNotificacion(id));
  }

  function handleMarkAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, leida: true })));
    startTransition(() => marcarTodosComoLeidos());
  }

  return (
    <NotificationsContext.Provider value={{ notifs, unreadCount, loaded, handleRead, handleDelete, handleMarkAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
}
