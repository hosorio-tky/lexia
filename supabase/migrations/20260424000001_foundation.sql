-- ============================================================
-- LEXIA — MIGRACIÓN 001: FUNDAMENTOS
-- Extensiones, helpers, tenants, profiles, catálogos, RLS
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ─── Helper: updated_at automático ──────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- TENANTS
-- ============================================================
create table tenants (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  slug        text unique not null,
  logo_url    text,
  activo      boolean default true,
  config      jsonb default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create trigger tenants_updated_at
  before update on tenants
  for each row execute function set_updated_at();

-- ============================================================
-- PROFILES (extiende auth.users)
-- ============================================================
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  tenant_id       uuid not null references tenants(id),
  nombre          text not null,
  apellido        text,
  email           text not null,
  rol             text not null default 'usuario'
                    check (rol in ('admin', 'supervisor', 'usuario', 'solo_lectura')),
  avatar_url      text,
  activo          boolean default true,
  ultimo_acceso   timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Auto-crear profile al registrar usuario en Supabase Auth
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, tenant_id, nombre, email, rol)
  values (
    new.id,
    (new.raw_app_meta_data ->> 'tenant_id')::uuid,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_app_meta_data ->> 'rol', 'usuario')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── Helpers RLS ────────────────────────────────────────────
create or replace function current_tenant_id()
returns uuid language sql stable security definer as $$
  select tenant_id from profiles where id = auth.uid()
$$;

create or replace function current_user_role()
returns text language sql stable security definer as $$
  select rol from profiles where id = auth.uid()
$$;

-- ============================================================
-- CATÁLOGOS
-- ============================================================
create table tipos_permiso (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id),
  nombre      text not null,
  descripcion text,
  color       text default '#64748B',
  activo      boolean default true,
  created_at  timestamptz default now()
);

create table entidades_reguladoras (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id),
  nombre      text not null,
  sigla       text,
  pais        text default 'SV',
  activo      boolean default true,
  created_at  timestamptz default now()
);

create table ubicaciones (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id),
  nombre         text not null,
  direccion      text,
  ciudad         text,
  departamento   text,
  activo         boolean default true,
  created_at     timestamptz default now()
);

-- ============================================================
-- RLS
-- ============================================================
alter table tenants               enable row level security;
alter table profiles              enable row level security;
alter table tipos_permiso         enable row level security;
alter table entidades_reguladoras enable row level security;
alter table ubicaciones           enable row level security;

create policy "tenants: ver el propio"
  on tenants for select using (id = current_tenant_id());

create policy "profiles: ver del tenant"
  on profiles for select using (tenant_id = current_tenant_id());

create policy "profiles: editar el propio"
  on profiles for update using (id = auth.uid());

create policy "tipos_permiso: select"
  on tipos_permiso for select using (tenant_id = current_tenant_id());

create policy "tipos_permiso: write admin"
  on tipos_permiso for insert
  with check (tenant_id = current_tenant_id()
    and current_user_role() in ('admin', 'supervisor'));

create policy "entidades_reguladoras: select"
  on entidades_reguladoras for select using (tenant_id = current_tenant_id());

create policy "entidades_reguladoras: write admin"
  on entidades_reguladoras for insert
  with check (tenant_id = current_tenant_id()
    and current_user_role() in ('admin', 'supervisor'));

create policy "ubicaciones: select"
  on ubicaciones for select using (tenant_id = current_tenant_id());

create policy "ubicaciones: write admin"
  on ubicaciones for insert
  with check (tenant_id = current_tenant_id()
    and current_user_role() in ('admin', 'supervisor'));

-- ============================================================
-- ÍNDICES
-- ============================================================
create index idx_profiles_tenant      on profiles(tenant_id);
create index idx_tipos_permiso_tenant on tipos_permiso(tenant_id);
create index idx_entidades_tenant     on entidades_reguladoras(tenant_id);
create index idx_ubicaciones_tenant   on ubicaciones(tenant_id);
