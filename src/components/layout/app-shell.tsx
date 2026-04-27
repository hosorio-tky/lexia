"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Library,
  LogOut,
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { signOut } from "@/app/actions/auth";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ChatSidebar } from "@/components/ai/chat-sidebar";
import { ROLE_LABELS } from "@/types/users";
import type { UserRole } from "@/types/users";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
};

interface AppShellUser {
  id?: string;
  nombre: string;
  nombre_completo: string;
  email: string;
  rol: string;
}

function SidebarNavItem({ item, active }: { item: NavItem; active: boolean }) {
  const cls =
    "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition " +
    (item.disabled
      ? "opacity-40 pointer-events-none cursor-default "
      : active
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-muted hover:text-foreground");

  const iconCls =
    "grid h-8 w-8 place-items-center rounded-lg ring-1 transition " +
    (active
      ? "bg-white/10 ring-white/15"
      : "bg-background ring-border group-hover:bg-background");

  return (
    <Link href={item.disabled ? "#" : item.href} className={cls}>
      <span className="flex items-center gap-2.5">
        <span className={iconCls}>{item.icon}</span>
        <span>{item.label}</span>
      </span>
      {item.badge ? <span className="shrink-0">{item.badge}</span> : null}
    </Link>
  );
}

function UserInitials({ nombre }: { nombre: string }) {
  const initials = nombre
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary text-xs font-bold ring-1 ring-primary/20">
      {initials}
    </div>
  );
}

export default function AppShell({
  title,
  breadcrumb,
  actions,
  children,
  user,
}: {
  title?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  user: AppShellUser;
}) {
  const pathname = usePathname();
  const [chatOpen, setChatOpen] = useState(false);

  const nav: NavItem[] = [
    { label: "Dashboard",     href: "/dashboard",       icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: "Permisos",      href: "/permisos",        icon: <FileText className="h-4 w-4" /> },
    { label: "Contratos",     href: "/contratos",       icon: <FileText className="h-4 w-4" />, disabled: true },
    { label: "Tareas",        href: "/tareas",          icon: <ClipboardCheck className="h-4 w-4" /> },
    { label: "Notificaciones",href: "/notificaciones",  icon: <Bell className="h-4 w-4" /> },
    { label: "Usuarios",      href: "/usuarios",        icon: <Users className="h-4 w-4" /> },
    { label: "Lexbase",        href: "/lexbase",          icon: <Library className="h-4 w-4" /> },
    { label: "Configuración", href: "/configuracion",   icon: <Settings className="h-4 w-4" /> },
  ];

  const rolLabel = ROLE_LABELS[user.rol as UserRole] ?? user.rol;

  return (
    <div className="min-h-svh bg-background text-foreground">
      {/* ── Header ── */}
      <div className="fixed inset-x-0 top-0 z-40 h-16 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-full max-w-[1400px] items-center gap-4 px-4 lg:px-6">
          <div className="text-sm text-muted-foreground">{breadcrumb}</div>

          <div className="mx-auto hidden w-full max-w-xl items-center lg:flex">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar permisos, expedientes…"
                className="h-10 w-full pl-9"
                type="search"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            {/* Botón AI Chat */}
            <button
              onClick={() => setChatOpen(true)}
              title="Abrir Lexia AI"
              className={`grid h-10 w-10 place-items-center rounded-xl ring-1 transition ${chatOpen ? "bg-primary text-primary-foreground ring-primary" : "bg-primary/10 text-primary ring-primary/20 hover:bg-primary/20"}`}
            >
              <Sparkles className="h-4 w-4" />
            </button>
            <Link href="/perfil">
              <button className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 transition hover:bg-primary/20 text-xs font-bold">
                {user.nombre_completo
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase()}
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Sidebar ── */}
      <aside className="fixed left-0 top-0 z-50 hidden h-svh w-[240px] border-r bg-background/80 backdrop-blur lg:flex lg:flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Lexia</div>
            <div className="text-xs text-muted-foreground">Gestión Legal</div>
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <nav className="grid gap-1">
            {nav.map((item) => (
              <SidebarNavItem
                key={item.label}
                item={item}
                active={
                  !item.disabled &&
                  (pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href)))
                }
              />
            ))}
          </nav>
        </div>

        {/* User */}
        <div className="px-3 pb-4">
          <div className="rounded-2xl border bg-card/70 p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <UserInitials nombre={user.nombre_completo || user.nombre} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{user.nombre_completo || user.nombre}</div>
                <div className="text-xs text-muted-foreground">{rolLabel}</div>
              </div>
            </div>
            <div className="mt-3">
              <form action={signOut}>
                <Button type="submit" variant="outline" className="h-9 w-full justify-between">
                  <span>Cerrar sesión</span>
                  <LogOut className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="w-full px-4 pb-10 pt-20 lg:pl-[264px] lg:pr-6">
        {(title || actions) && (
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            {title && <h1 className="text-2xl font-bold tracking-tight">{title}</h1>}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </main>

      {/* ── AI Chat Sidebar ── */}
      <ChatSidebar open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
