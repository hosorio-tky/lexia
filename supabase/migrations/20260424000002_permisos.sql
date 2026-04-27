-- ============================================================
-- LEXIA — MIGRACIÓN 002: MÓDULO PERMISOS (MVP)
-- 8 estados de workflow, historial, RLS
-- ============================================================

-- ─── ENUM: estados del workflow ─────────────────────────────
create type permiso_estado as enum (
  'Identificado',
  'Requisitos',
  'En Trámite',
  'En Revisión',
  'Vigente',
  'Pre-Renovación',
  'Suspendido',
  'Vencido'
);

-- ─── ENUM: tipos de permiso ──────────────────────────────────
create type permiso_tipo as enum (
  'Ambiental',
  'Sanitario',
  'Operativo',
  'Construcción',
  'Importación',
  'Laboral',
  'Tributario'
);

-- ============================================================
-- TABLA PRINCIPAL: PERMISOS
-- ============================================================
create table permisos (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id),

  -- Identificación
  numero_expediente     text,
  nombre                text not null,
  descripcion           text,

  -- Clasificación
  tipo                  permiso_tipo not null,
  entidad_reguladora    text,
  ubicacion             text,

  -- Workflow
  estado                permiso_estado not null default 'Identificado',

  -- Fechas clave
  fecha_solicitud       date,
  fecha_emision         date,
  fecha_vencimiento     date,

  -- Responsable
  responsable_id        uuid references responsables(id) on delete set null,
  responsable_nombre    text,   -- desnormalizado para lecturas rápidas

  -- Extras
  etiquetas             text[] default '{}',
  notas_internas        text,
  metadata              jsonb default '{}',

  -- Auditoría
  created_by            uuid references profiles(id) on delete set null,
  updated_by            uuid references profiles(id) on delete set null,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create trigger permisos_updated_at
  before update on permisos
  for each row execute function set_updated_at();

-- ─── ÍNDICES ────────────────────────────────────────────────
create index idx_permisos_tenant       on permisos(tenant_id);
create index idx_permisos_estado       on permisos(tenant_id, estado);
create index idx_permisos_vencimiento  on permisos(tenant_id, fecha_vencimiento);
create index idx_permisos_responsable  on permisos(responsable_id);

create index idx_permisos_search
  on permisos using gin(
    to_tsvector('spanish', nombre || ' ' || coalesce(numero_expediente, '') || ' ' || coalesce(entidad_reguladora, ''))
  );

-- ============================================================
-- HISTORIAL DE ESTADOS (Timeline — M01-F04)
-- ============================================================
create table permiso_estados_historial (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id),
  permiso_id       uuid not null references permisos(id) on delete cascade,
  estado_anterior  permiso_estado,
  estado_nuevo     permiso_estado not null,
  comentario       text,
  changed_by       uuid references profiles(id) on delete set null,
  changed_by_nombre text,  -- desnormalizado
  changed_at       timestamptz default now()
);

create index idx_permiso_historial_permiso on permiso_estados_historial(permiso_id);
create index idx_permiso_historial_tenant  on permiso_estados_historial(tenant_id, changed_at desc);

-- Auto-registrar cambio de estado en historial
create or replace function log_permiso_estado_change()
returns trigger language plpgsql as $$
begin
  if old.estado is distinct from new.estado then
    insert into permiso_estados_historial
      (tenant_id, permiso_id, estado_anterior, estado_nuevo, changed_by, changed_by_nombre)
    values
      (new.tenant_id, new.id, old.estado, new.estado,
       new.updated_by,
       (select nombre || ' ' || coalesce(apellido, '') from profiles where id = new.updated_by));
  end if;
  return new;
end;
$$;

create trigger permiso_estado_change
  after update on permisos
  for each row execute function log_permiso_estado_change();

-- ============================================================
-- RLS — PERMISOS
-- ============================================================
alter table permisos                  enable row level security;
alter table permiso_estados_historial enable row level security;

-- Todos los usuarios del tenant pueden leer
create policy "permisos: select"
  on permisos for select
  using (tenant_id = current_tenant_id());

-- Admin, supervisor y usuario pueden crear
create policy "permisos: insert"
  on permisos for insert
  with check (tenant_id = current_tenant_id()
    and current_user_role() in ('admin', 'supervisor', 'usuario'));

-- Admin, supervisor y usuario pueden editar
create policy "permisos: update"
  on permisos for update
  using (tenant_id = current_tenant_id()
    and current_user_role() in ('admin', 'supervisor', 'usuario'));

-- Solo admin puede eliminar
create policy "permisos: delete admin"
  on permisos for delete
  using (tenant_id = current_tenant_id()
    and current_user_role() = 'admin');

-- Historial: lectura del tenant
create policy "permiso_historial: select"
  on permiso_estados_historial for select
  using (tenant_id = current_tenant_id());

-- ============================================================
-- VISTA: permisos con días restantes y semáforo
-- ============================================================
create or replace view v_permisos as
select
  p.*,
  (p.fecha_vencimiento - current_date) as dias_restantes,
  case
    when p.fecha_vencimiento < current_date           then 'vencido'
    when p.fecha_vencimiento <= current_date + 15     then 'critico'
    when p.fecha_vencimiento <= current_date + 30     then 'advertencia'
    when p.fecha_vencimiento <= current_date + 90     then 'proximo'
    else 'vigente'
  end as semaforo
from permisos p;
