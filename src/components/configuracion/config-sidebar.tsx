"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  BookOpen,
  Bell,
  ShieldCheck,
  ScrollText,
  Users,
  MapPin,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfigNavItem {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  adminOnly: boolean;
}

const NAV_ITEMS: ConfigNavItem[] = [
  {
    href:        "/configuracion/empresa",
    label:       "Empresa",
    description: "Nombre, logo y datos generales",
    icon:        <Building2 className="h-4 w-4" />,
    adminOnly:   true,
  },
  {
    href:        "/configuracion/catalogos",
    label:       "Catálogos",
    description: "Tipos, entidades y listas de valores",
    icon:        <BookOpen className="h-4 w-4" />,
    adminOnly:   true,
  },
  {
    href:        "/configuracion/responsables",
    label:       "Responsables",
    description: "Personas asignables a permisos",
    icon:        <Users className="h-4 w-4" />,
    adminOnly:   true,
  },
  {
    href:        "/configuracion/ubicaciones",
    label:       "Ubicaciones",
    description: "Plantas, sedes y oficinas",
    icon:        <MapPin className="h-4 w-4" />,
    adminOnly:   true,
  },
  {
    href:        "/configuracion/alertas",
    label:       "Alertas",
    description: "Plantillas de notificaciones",
    icon:        <Bell className="h-4 w-4" />,
    adminOnly:   true,
  },
  {
    href:        "/configuracion/roles",
    label:       "Roles y permisos",
    description: "Qué puede hacer cada rol",
    icon:        <ShieldCheck className="h-4 w-4" />,
    adminOnly:   false,
  },
  {
    href:        "/configuracion/auditoria",
    label:       "Auditoría",
    description: "Historial de actividad del sistema",
    icon:        <ScrollText className="h-4 w-4" />,
    adminOnly:   false,
  },
  {
    href:        "/configuracion/estado",
    label:       "Estado del Sistema",
    description: "Logs técnicos y salud del sistema",
    icon:        <Activity className="h-4 w-4" />,
    adminOnly:   true,
  },
];

export function ConfigSidebar({ rol }: { rol: string }) {
  const pathname  = usePathname();
  const isAdmin   = rol === "admin";
  const visibleItems = NAV_ITEMS.filter((i) => !i.adminOnly || isAdmin);

  return (
    <nav className="flex flex-row gap-1 overflow-x-auto pb-1 lg:w-56 lg:flex-col lg:pb-0 shrink-0">
      {visibleItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition whitespace-nowrap lg:whitespace-normal",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 transition",
                active
                  ? "bg-white/10 ring-white/15"
                  : "bg-background ring-border"
              )}
            >
              {item.icon}
            </span>
            <span className="hidden lg:block">
              <span className="block font-medium leading-tight">{item.label}</span>
              <span className={cn("block text-xs leading-tight", active ? "text-primary-foreground/70" : "text-muted-foreground")}>
                {item.description}
              </span>
            </span>
            <span className="lg:hidden">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
