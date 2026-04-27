-- ============================================================
-- LEXIA — MIGRACIÓN 003: MÓDULO USUARIOS (T05 MVP)
-- Extiende profiles, log de actividad, RLS adicional
-- ============================================================

-- ─── Extender profiles con campos de perfil (T05-F04) ───────
alter table profiles
  add column if not exists cargo          text,
  add column if not exists departamento   text,
  add column if not exists telefono       text,
  add column if not exists invited_by     uuid references profiles(id) on delete set null;

-- ─── Tabla: log de actividad por usuario (T05-F05) ──────────
create table user_activity_log (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id),
  user_id      uuid references profiles(id) on delete set null,
  user_nombre  text,           -- desnormalizado para histórico
  accion       text not null,  -- 'login', 'crear_permiso', 'cambiar_estado', etc.
  modulo       text,           -- 'permisos', 'usuarios', 'auth'
  recurso_id   text,           -- uuid del recurso afectado
  recurso_desc text,           -- descripción legible del recurso
  metadata     jsonb default '{}',
  created_at   timestamptz default now()
);

create index idx_activity_tenant   on user_activity_log(tenant_id, created_at desc);
create index idx_activity_user     on user_activity_log(user_id, created_at desc);
create index idx_activity_modulo   on user_activity_log(tenant_id, modulo);

-- ─── RLS: actividad ─────────────────────────────────────────
alter table user_activity_log enable row level security;

create policy "activity: select tenant"
  on user_activity_log for select
  using (tenant_id = current_tenant_id());

create policy "activity: insert tenant"
  on user_activity_log for insert
  with check (tenant_id = current_tenant_id());

-- ─── RLS adicional: profiles ────────────────────────────────
-- Permite a admin actualizar perfiles de otros usuarios del mismo tenant
create policy "profiles: update admin"
  on profiles for update
  using (
    tenant_id = current_tenant_id()
    and (id = auth.uid() or current_user_role() = 'admin')
  );
