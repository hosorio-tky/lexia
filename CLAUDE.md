# Lexia — Guía de Arquitectura y Mejores Prácticas

## 1. Contexto del Proyecto

**Lexia** es un SaaS B2B de gestión legal corporativa. Arquitectura: **monolito modular** con principios de **Clean Architecture**. Multi-tenant desde el día uno (PostgreSQL RLS).

### Stack principal
| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Estilos | Tailwind CSS v4, Shadcn/UI (Radix UI) |
| Backend | Next.js Server Actions + Server Components |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Supabase Auth (pendiente de implementar) |

---

## 2. Estructura de Directorios

```
src/
├── app/                          # Next.js App Router (solo rutas y páginas)
│   ├── (dashboard)/              # Layout autenticado
│   │   ├── permisos/             # Módulo Permisos
│   │   │   ├── page.tsx          # Server Component — listado
│   │   │   ├── nuevo/page.tsx    # Server Component — formulario crear
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # Server Component — detalle
│   │   │       └── editar/page.tsx
│   │   └── layout.tsx
│   ├── actions/                  # Server Actions (mutations)
│   │   └── permisos.ts
│   └── globals.css
│
├── components/                   # Componentes de UI reutilizables
│   ├── ui/                       # Shadcn/UI primitivos (no modificar)
│   ├── layout/                   # Shell, sidebar, header
│   └── permisos/                 # Componentes específicos del módulo
│
├── lib/                          # Infraestructura y utilidades
│   ├── supabase/                 # Clientes Supabase
│   │   ├── admin.ts              # Service role (solo server-side)
│   │   ├── server.ts             # Server Component client (cookies)
│   │   └── client.ts             # Browser client (Client Components)
│   └── repositories/             # Capa de acceso a datos
│       └── permisos.ts
│
└── types/                        # Tipos y constantes de dominio
    └── permits.ts
```

### Estructura objetivo para módulos futuros (Clean Architecture)

Cuando un módulo crezca en complejidad, migrar a esta estructura:

```
src/modules/[modulo]/
├── domain/
│   ├── entities/         # Tipos e interfaces del dominio (sin dependencias)
│   ├── value-objects/    # Objetos de valor inmutables
│   └── constants.ts      # Constantes de dominio (estados, tipos)
├── application/
│   ├── use-cases/        # Casos de uso (orquestan dominio + repositorio)
│   └── dtos/             # Data Transfer Objects (entrada/salida)
├── infrastructure/
│   ├── repositories/     # Implementaciones concretas (Supabase)
│   └── mappers/          # DB row → Domain entity
└── presentation/
    ├── components/       # Componentes React del módulo
    ├── actions/          # Server Actions
    └── hooks/            # Custom hooks del módulo
```

---

## 3. Multi-Tenancy

### Reglas obligatorias

1. **Todas las tablas** deben tener columna `tenant_id UUID NOT NULL REFERENCES tenants(id)`.
2. **Todas las tablas** deben tener RLS habilitado (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
3. **Todas las políticas RLS** deben filtrar por `current_tenant_id()`.
4. **Nunca** hardcodear un `tenant_id` en producción — usar `current_tenant_id()` en SQL o `auth.uid()` resuelto en Server Actions.

### Patrón de políticas RLS

```sql
-- SELECT
CREATE POLICY "tenant_select" ON tabla
  FOR SELECT USING (tenant_id = current_tenant_id());

-- INSERT
CREATE POLICY "tenant_insert" ON tabla
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

-- UPDATE / DELETE
CREATE POLICY "tenant_update" ON tabla
  FOR UPDATE USING (tenant_id = current_tenant_id());
```

### Estado temporal (hasta implementar Auth)

- `DEMO_TENANT_ID = "00000000-0000-0000-0000-000000000001"` en Server Actions
- `createAdminClient()` bypasea RLS — solo válido para desarrollo sin auth
- **TODO**: Reemplazar con `getServerSession()` + cliente con cookies cuando Auth esté listo

---

## 4. Clean Architecture — Capas y Responsabilidades

```
Domain → Application → Infrastructure → Presentation
  ↑           ↑              ↑               ↑
sin deps    usa domain    usa domain      usa todo
```

### Domain (sin dependencias externas)
- Entidades: interfaces TypeScript puras (`Permit`, `TimelineEvent`)
- Value Objects: tipos con validación (`PermitStatus`, `PermitTipo`)
- Constantes: arrays y records de dominio (`PERMIT_STATUSES`, `STATUS_TRANSITIONS`)
- **Nunca** importar Supabase, React, Next.js aquí

### Application (usa solo Domain)
- Casos de uso: funciones que orquestan repositorio + lógica de negocio
- DTOs: tipos de entrada/salida para casos de uso
- **Nunca** importar Supabase directamente — recibir repositorio por inyección

### Infrastructure (implementa interfaces de Domain/Application)
- Repositorios: implementaciones concretas usando Supabase
- Mappers: transforman DB rows en Domain entities
- Patrón: `createPermisosRepository(client)` — factory que recibe el cliente

### Presentation (React + Next.js)
- Server Components: obtienen datos (importan repositorios directamente)
- Client Components: interactividad, formularios, estado local
- Server Actions: mutations (crearX, editarX, cambiarEstadoX, eliminarX)

---

## 5. Server Components vs Client Components

### Usar Server Component cuando:
- Necesita leer datos de la BD
- No tiene interactividad del usuario
- No usa hooks de React (`useState`, `useEffect`, etc.)
- Es una página o layout

### Usar Client Component (`"use client"`) cuando:
- Maneja estado local (`useState`, `useReducer`)
- Responde a eventos del usuario (clicks, inputs)
- Usa efectos (`useEffect`)
- Necesita acceso a APIs del browser
- Usa hooks de transición (`useTransition`)

### Patrón estándar (página → cliente)

```tsx
// page.tsx — Server Component (fetches data)
export default async function Page() {
  const data = await repo.list();
  return <FeatureClient initialData={data} />;
}

// feature-client.tsx — Client Component (interactivity)
"use client";
export function FeatureClient({ initialData }: { initialData: Data[] }) {
  const [data, setData] = useState(initialData);
  // ...
}
```

---

## 6. Server Actions

### Estructura estándar

```ts
"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createXRepository } from "@/lib/repositories/x";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function crearX(formData: FormData) {
  const client = createAdminClient();          // TODO: reemplazar con auth client
  const repo   = createXRepository(client);
  const tenant = DEMO_TENANT_ID;               // TODO: obtener de sesión

  const { error } = await repo.create({
    tenant_id: tenant,
    nombre:    formData.get("nombre") as string,
    // ...
  });

  if (error) throw new Error(error.message);

  revalidatePath("/x");
  redirect("/x");
}
```

### Reglas de Server Actions
1. Siempre en archivos separados en `app/actions/[modulo].ts`
2. Siempre `"use server"` al inicio del archivo
3. Llamar `revalidatePath` después de cualquier mutación
4. Llamar `redirect` solo después de create/delete (no en update — dejar al cliente)
5. **Nunca** retornar datos complejos — usar `revalidatePath` + re-fetch del Server Component

---

## 7. Repositorios

### Interfaz del patrón

```ts
// Factory function — permite inyección del cliente Supabase
export function createXRepository(client: SupabaseClient) {
  return {
    list:         (filters?: XFilters) => Promise<X[]>,
    getById:      (id: string)         => Promise<X | null>,
    create:       (input: CreateXDTO)  => Promise<X>,
    update:       (id: string, input: UpdateXDTO) => Promise<X>,
    changeStatus: (id: string, status: XStatus, comment?: string) => Promise<void>,
    delete:       (id: string)         => Promise<void>,
  };
}
```

### Reglas de repositorios
1. **Nunca** retornar el row crudo de Supabase — siempre mapear a entidad de dominio
2. El mapper vive junto al repositorio o en `infrastructure/mappers/`
3. Los repositorios no tienen lógica de negocio — solo CRUD y queries
4. Usar `.throwOnError()` o manejar errores explícitamente

---

## 8. Clientes Supabase — Cuándo usar cuál

| Cliente | Archivo | Cuándo usar |
|---|---|---|
| `createAdminClient()` | `lib/supabase/admin.ts` | Server Actions, scripts, migraciones. Bypasea RLS. |
| `createClient()` (server) | `lib/supabase/server.ts` | Server Components que necesitan auth del usuario. |
| `createClient()` (browser) | `lib/supabase/client.ts` | Client Components con subscripciones realtime. |

> **Regla de oro**: Preferir `admin.ts` en Server Actions durante desarrollo. En producción, usar `server.ts` con el cliente del usuario para que RLS aplique correctamente.

---

## 9. Convenciones de Nombrado

### Archivos
| Tipo | Convención | Ejemplo |
|---|---|---|
| Server Component (página) | `page.tsx` | `permisos/page.tsx` |
| Client Component | `kebab-case-client.tsx` | `permit-list-client.tsx` |
| Server Action | `kebab-case.ts` en `actions/` | `actions/permisos.ts` |
| Repositorio | `kebab-case.ts` en `repositories/` | `repositories/permisos.ts` |
| Tipos de dominio | `kebab-case.ts` en `types/` | `types/permits.ts` |
| Componente UI | `kebab-case.tsx` en `components/[modulo]/` | `permit-status-badge.tsx` |

### TypeScript
- **Interfaces**: PascalCase, prefijo descriptivo → `Permit`, `TimelineEvent`, `PermitFilters`
- **Types**: PascalCase → `PermitStatus`, `PermitTipo`
- **Constantes**: SCREAMING_SNAKE_CASE → `PERMIT_STATUSES`, `STATUS_TRANSITIONS`
- **Funciones**: camelCase → `createPermit`, `mapRow`, `workflowProgress`
- **React Components**: PascalCase → `PermitListClient`, `PermitStatusBadge`

### Base de datos
- **Tablas**: snake_case plural → `permisos`, `permiso_estados_historial`
- **Columnas**: snake_case → `tenant_id`, `fecha_vencimiento`, `responsable_nombre`
- **Enums**: snake_case → `permiso_estado`, `permiso_tipo`
- **Funciones/triggers**: snake_case verbos → `log_permiso_estado_change`, `set_updated_at`
- **Índices**: `idx_[tabla]_[columna]`
- **Policies RLS**: `"[tabla]_[accion]_tenant"` → `"permisos_select_tenant"`

### Módulos
- **Directorio del módulo**: plural en español → `permisos/`, `contratos/`, `litigios/`
- **Prefijo de componentes**: sustantivo en inglés → `PermitXxx`, `ContractXxx`
- **Prefijo de actions**: verbo en español → `crearPermiso`, `editarContrato`

---

## 10. TypeScript — Estándares

```ts
// BIEN: tipos explícitos en interfaces públicas
export interface CreatePermisoDTO {
  tenant_id:           string;
  nombre:              string;
  tipo:                PermitTipo;
  entidad_reguladora?: string;
}

// BIEN: inferencia donde es obvia
const result = await repo.create(dto);  // tipo inferido del repositorio

// MAL: any
const data: any = await supabase...    // NUNCA

// BIEN: unknown con narrowing
const data: unknown = await fetch(...);
if (isPermit(data)) { ... }

// BIEN: null explícito
getById(id: string): Promise<Permit | null>

// MAL: undefined implícito en retornos de BD
getById(id: string): Promise<Permit | undefined>  // preferir | null
```

### Reglas TypeScript
1. `strict: true` en `tsconfig.json` — sin excepciones
2. **Nunca** usar `any` — usar `unknown` + narrowing o tipos correctos
3. Los tipos de dominio van en `types/[modulo].ts`, no inline en componentes
4. Preferir `interface` para objetos de dominio, `type` para uniones/aliases
5. Los props de componentes siempre tipados inline o con `interface XxxProps`

---

## 11. Migraciones de Base de Datos

### Convención de nombrado
```
supabase/migrations/
  YYYYMMDDHHMMSS_descripcion_corta.sql
  20260424000001_foundation.sql
  20260424000002_permisos.sql
  20260501000001_contratos.sql
```

### Cada migración debe incluir
1. Comentario de cabecera con propósito
2. Extensiones requeridas (`CREATE EXTENSION IF NOT EXISTS`)
3. Tipos/enums antes de tablas
4. Tablas con `tenant_id`, `created_at` y `updated_at`
5. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
6. Todas las políticas RLS
7. Índices (especialmente sobre `tenant_id` + campos de filtro frecuentes)
8. Vistas de conveniencia si aplica

### Seeds
- `supabase/seeds/seed.sql` solo para datos de desarrollo/demo
- Usar el tenant demo: `'00000000-0000-0000-0000-000000000001'`
- **Nunca** seeds con datos reales de producción en el repo

---

## 12. Patrones de UI

### Composición de formularios
```tsx
// Field wrapper para consistencia visual
function Field({ label, required, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="ml-1 text-destructive">*</span>}</Label>
      {children}
    </div>
  );
}
```

### Manejo de estados de carga
- Usar `useTransition` para Server Actions (no bloquea UI)
- `isPending` para deshabilitar botones durante mutaciones
- Optimistic updates donde la UX lo justifique (ej: cambio de estado workflow)

### Feedback al usuario
- Errores de validación: inline bajo el campo
- Errores de servidor: toast (implementar con `sonner`)
- Éxito: `redirect` a la vista resultante (create → detail, delete → list)
- Estado "guardando": texto en botón (`isPending ? "Guardando…" : "Guardar"`)

---

## 13. Cómo Agregar un Nuevo Módulo

Seguir estos pasos en orden:

### Paso 1 — Migración SQL
```
supabase/migrations/YYYYMMDDHHMMSS_[modulo].sql
```
- Definir enums, tabla principal con `tenant_id`, tabla de historial si aplica
- Habilitar RLS y crear políticas
- Crear índices sobre `tenant_id` + campos frecuentes
- Vista de conveniencia con campos calculados si aplica

### Paso 2 — Seed (si aplica)
Agregar datos de ejemplo al tenant demo en `seeds/seed.sql`.

### Paso 3 — Tipos de dominio
```
src/types/[modulo].ts
```
- Constantes (estados, tipos, colores de estado)
- Interfaces de entidades y DTOs
- Tipos de filtros

### Paso 4 — Repositorio
```
src/lib/repositories/[modulo].ts
```
- Factory `createXRepository(client)`
- Métodos: list, getById, create, update, changeStatus, delete
- Mapper de DB row → entidad de dominio

### Paso 5 — Server Actions
```
src/app/actions/[modulo].ts
```
- crearX, editarX, cambiarEstadoX, eliminarX
- Usar `createAdminClient()` + repositorio
- `revalidatePath` + `redirect` según corresponda

### Paso 6 — Componentes
```
src/components/[modulo]/
  [modulo]-list-client.tsx      # Tabla/grid con filtros
  [modulo]-detail-client.tsx    # Vista detalle con acciones
  [modulo]-form-client.tsx      # Formulario crear/editar
  [modulo]-status-badge.tsx     # Badge de estado
  [modulo]-workflow-modal.tsx   # Modal cambio de estado
  [modulo]-timeline.tsx         # Historial de cambios
```

### Paso 7 — Páginas (rutas)
```
src/app/(dashboard)/[modulo]/
  page.tsx                      # Listado
  nuevo/page.tsx                # Crear
  [id]/page.tsx                 # Detalle
  [id]/editar/page.tsx          # Editar
```

### Paso 8 — Navegación
Agregar el módulo al sidebar en `src/components/layout/app-shell.tsx`.

---

## 14. Lo que está Fuera de Scope (por ahora)

Los siguientes temas están diferidos hasta fases posteriores. **No implementar** sin discutirlo primero:

- **Autenticación**: Supabase Auth + middleware de sesión
- **Autorización por roles**: RBAC dentro del tenant (admin, editor, viewer)
- **Multi-tenant dinámico**: UI para crear/gestionar tenants
- **Notificaciones**: email/in-app para vencimientos
- **Documentos adjuntos**: Supabase Storage
- **Exportación**: PDF/Excel de reportes
- **API pública**: REST o GraphQL para integraciones
- **Tests automatizados**: Vitest + Testing Library (agregar cuando el módulo esté estable)
- **Otros módulos**: Contratos, Litigios, Societario, Cumplimiento, Tareas (post-MVP Permisos)

---

## 15. Variables de Entorno

```bash
# Supabase local (development)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...    # NUNCA exponer al cliente

# Puertos Supabase local (instancia lexia)
# API: 54331 | DB: 54332 | Studio: 54333
# Inbucket: 54334 | Analytics: 54337
# App Next.js: 3002
```

> `SUPABASE_SERVICE_ROLE_KEY` solo se usa en `lib/supabase/admin.ts`. Nunca en código cliente ni en variables `NEXT_PUBLIC_*`.

---

## 16. Comandos de Desarrollo

```bash
# Iniciar Supabase local
npx supabase start

# Resetear BD y aplicar todas las migraciones + seed
npx supabase db reset

# Ver logs de Supabase
npx supabase logs

# Iniciar Next.js (puerto 3002)
npm run dev -- -p 3002

# Supabase Studio
http://localhost:54333

# Generar tipos TypeScript desde el esquema actual de la BD
npx supabase gen types typescript --local > src/types/supabase.ts
```

---

*Última actualización: 2026-04-24*
