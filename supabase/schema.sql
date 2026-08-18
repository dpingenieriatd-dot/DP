-- =========================================================================
-- D&P Ingeniería Integral — Plataforma interna — Fase 1
-- Pegar completo en el SQL Editor de Supabase (Database > SQL Editor > New query)
-- y ejecutar una sola vez. Es seguro volver a correrlo (usa IF NOT EXISTS /
-- CREATE OR REPLACE en todo lo que lo admite).
-- =========================================================================

-- ---------------------------------------------------------------------
-- 0. Utilidades
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. Perfiles y control de acceso
-- ---------------------------------------------------------------------
-- role: 'admin' ve y administra todo, sin importar "modules".
-- modules: subconjunto de {'seguimiento','gestion'} — a qué módulos tiene
-- acceso una persona que no es admin. Vacío por defecto: sin acceso hasta
-- que un admin lo asigne desde el panel de Usuarios.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  cargo text,
  role text not null default 'member' check (role in ('admin', 'member')),
  modules text[] not null default '{}',
  capacidad_semanal_horas numeric not null default 40,
  created_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid()) = 'admin', false);
$$;

create or replace function has_module(mod text)
returns boolean language sql stable security definer set search_path = public as $$
  select is_admin() or coalesce(
    (select mod = any(modules) from profiles where id = auth.uid()),
    false
  );
$$;

alter table profiles enable row level security;

drop policy if exists "profiles: leer la propia o admin lee todas" on profiles;
create policy "profiles: leer la propia o admin lee todas"
  on profiles for select
  using (id = auth.uid() or is_admin());

-- Solo un admin puede cambiar role/modules/cargo/capacidad de cualquier
-- perfil (incluido el propio). A propósito NO existe una política que
-- permita a cada usuario editar su propia fila: si la hubiera, cualquier
-- persona podría hacer UPDATE profiles SET role='admin' sobre sí misma,
-- porque RLS no restringe por columna, solo por fila.
drop policy if exists "profiles: admin actualiza cualquiera" on profiles;
create policy "profiles: admin actualiza cualquiera"
  on profiles for update
  using (is_admin());

-- ---------------------------------------------------------------------
-- 2. Módulo Seguimiento
-- ---------------------------------------------------------------------
create table if not exists tareas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  cliente text,
  prioridad text not null default 'Media' check (prioridad in ('Alta', 'Media', 'Baja')),
  fecha_limite date,
  descripcion text,
  publicado_por uuid references profiles(id),
  responsable uuid references profiles(id),
  estado text not null default 'Disponible' check (estado in ('Disponible', 'En proceso', 'Pausada', 'Terminada')),
  horas_estimadas numeric,
  horas_reales numeric not null default 0,
  avance_pct integer not null default 0 check (avance_pct between 0 and 100),
  entregable text,
  notas text,
  fecha_toma date,
  fecha_cierre date,
  archivado boolean not null default false,
  -- Calidad del entregable (1-5 -> 20/40/60/80/100), solo sobre Terminadas, solo admin. Null = sin calificar.
  calidad_pct numeric check (calidad_pct is null or calidad_pct in (20, 40, 60, 80, 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_tareas_updated_at on tareas;
create trigger trg_tareas_updated_at before update on tareas
  for each row execute function set_updated_at();

-- Sesiones de cronómetro por tarea; horas_reales de la tarea se acumula al
-- cerrar cada sesión (lo hace la aplicación, no un trigger, para poder
-- mostrar el cronómetro corriendo en vivo sin tocar la fila de la tarea).
create table if not exists registros_tiempo (
  id uuid primary key default gen_random_uuid(),
  tarea_id uuid not null references tareas(id) on delete cascade,
  usuario_id uuid not null references profiles(id),
  inicio timestamptz not null default now(),
  fin timestamptz,
  duracion_segundos integer,
  created_at timestamptz not null default now()
);

-- Registro histórico de actividades (incluye lo cerrado desde el banco de
-- tareas y lo registrado manualmente, como en el prototipo original).
create table if not exists actividades (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  hora time,
  usuario_id uuid references profiles(id),
  cargo text,
  actividad text not null,
  cliente text,
  estado text not null default 'Pendiente' check (estado in ('Cumplido', 'Parcial', 'Pendiente', 'No cumplido')),
  observaciones text,
  respuesta text,
  enlaces text[] not null default '{}',
  origen text not null default 'Manual' check (origen in ('Manual', 'Banco de tareas', 'Asignada por líder')),
  created_at timestamptz not null default now()
);

create table if not exists agenda_bloques (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references profiles(id),
  dia date not null,
  hora_inicio time not null,
  horas numeric not null default 1,
  tarea text,
  cliente text,
  -- Vínculo opcional a la tarea/actividad que originó el bloque (Fase 3 de
  -- ajustes UAT). El estado se lee en vivo de tareas.estado por join, no se
  -- duplica aquí. Bloques creados a mano (sin vínculo) siguen funcionando
  -- igual que antes.
  tarea_id uuid references tareas(id) on delete set null,
  actividad_id uuid references actividades(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Fila única (id = 1) con los pesos del cálculo de efectividad. Versionado
-- simple: se sobreescribe y queda el historial en el registro de auditoría
-- del propio Supabase; si más adelante se pide historial explícito, se
-- puede convertir en tabla de versiones con vigente_desde/vigente_hasta.
create table if not exists efectividad_parametros (
  id int primary key default 1 check (id = 1),
  peso_cumplimiento numeric not null default 50,
  peso_oportunidad numeric not null default 25,
  peso_calidad numeric not null default 15,
  -- Antes "equilibrio de carga" (leía agenda_bloques) — Angélica pidió que Efectividad no
  -- dependa de las horas planificadas en Agenda; ahora compara horas_estimadas vs. horas_reales.
  peso_eficiencia_tiempo numeric not null default 10,
  umbral_carga_equilibrada_pct numeric not null default 90,
  capacidad_semanal_estandar_horas numeric not null default 40,
  actualizado_por uuid references profiles(id),
  updated_at timestamptz not null default now()
);
insert into efectividad_parametros (id) values (1) on conflict (id) do nothing;
drop trigger if exists trg_efectividad_parametros_updated_at on efectividad_parametros;
create trigger trg_efectividad_parametros_updated_at before update on efectividad_parametros
  for each row execute function set_updated_at();

alter table tareas enable row level security;
alter table registros_tiempo enable row level security;
alter table actividades enable row level security;
alter table agenda_bloques enable row level security;
alter table efectividad_parametros enable row level security;

-- Eliminar tareas queda restringido a admin (Directora de Proyectos); el
-- resto de operaciones sigue abierto a cualquiera con el módulo.
drop policy if exists "seguimiento: acceso por módulo" on tareas;
create policy "seguimiento: leer/crear/editar por módulo" on tareas
  for select using (has_module('seguimiento'));
create policy "seguimiento: crear por módulo" on tareas
  for insert with check (has_module('seguimiento'));
create policy "seguimiento: editar por módulo" on tareas
  for update using (has_module('seguimiento')) with check (has_module('seguimiento'));
create policy "seguimiento: eliminar solo admin" on tareas
  for delete using (is_admin());

-- RLS no puede restringir por columna, solo por fila (mismo problema que profiles) — archivado y
-- calidad_pct necesitan quedar admin-only mientras el resto de columnas siguen abiertas a cualquiera
-- con el módulo (para que pausar/reanudar/terminar tarea funcionen). Se resuelve con un trigger.
create or replace function guard_tareas_admin_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.archivado is distinct from old.archivado or new.calidad_pct is distinct from old.calidad_pct)
     and not is_admin() then
    raise exception 'Solo un administrador (Directora de Proyectos) puede archivar o calificar la calidad de una tarea.';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_tareas_guard_admin_columns on tareas;
create trigger trg_tareas_guard_admin_columns
  before update on tareas
  for each row execute function guard_tareas_admin_columns();

-- Cada quien solo puede tocar sus propios registros de cronómetro — toda la app ya consulta
-- siempre por usuario_id = usuario logueado, así que esto no rompe ningún flujo existente.
drop policy if exists "seguimiento: acceso por módulo" on registros_tiempo;
create policy "seguimiento: propios registros de tiempo" on registros_tiempo
  for all using (has_module('seguimiento') and usuario_id = auth.uid())
  with check (has_module('seguimiento') and usuario_id = auth.uid());

drop policy if exists "seguimiento: acceso por módulo" on actividades;
create policy "seguimiento: acceso por módulo" on actividades
  for all using (has_module('seguimiento')) with check (has_module('seguimiento'));

drop policy if exists "seguimiento: acceso por módulo" on agenda_bloques;
create policy "seguimiento: acceso por módulo" on agenda_bloques
  for all using (has_module('seguimiento')) with check (has_module('seguimiento'));

drop policy if exists "seguimiento: leer parámetros de efectividad" on efectividad_parametros;
create policy "seguimiento: leer parámetros de efectividad" on efectividad_parametros
  for select using (has_module('seguimiento'));
drop policy if exists "seguimiento: solo admin edita parámetros de efectividad" on efectividad_parametros;
create policy "seguimiento: solo admin edita parámetros de efectividad" on efectividad_parametros
  for update using (is_admin());

-- ---------------------------------------------------------------------
-- 3. Módulo Gestión — catálogos
-- ---------------------------------------------------------------------
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  nit text,
  contacto text,
  telefono text,
  correo text,
  direccion text,
  nombre_asesor text,
  ciudad text,
  estado text not null default 'Activo' check (estado in ('Activo', 'Inactivo')),
  notas text,
  created_at timestamptz not null default now()
);

-- Nota: la diferencia exacta entre "Clientes" y "Empresas atendidas" no
-- quedó definida todavía (ver Solicitud de Información) — se crea la tabla
-- para no bloquear el resto del esquema, ajustar campos cuando se confirme.
create table if not exists empresas_atendidas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cliente_id uuid references clientes(id),
  ciudad text,
  estado text not null default 'Activo' check (estado in ('Activo', 'Inactivo')),
  notas text,
  created_at timestamptz not null default now()
);

create table if not exists proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  nit text,
  contacto text,
  telefono text,
  correo text,
  direccion text,
  nombre_asesor text,
  ciudad text,
  forma_pago text default 'Transferencia',
  estado text not null default 'Activo' check (estado in ('Activo', 'Inactivo')),
  notas text,
  created_at timestamptz not null default now()
);

create table if not exists insumos (
  id uuid primary key default gen_random_uuid(),
  codigo text,
  categoria text,
  descripcion text not null,
  unidad text,
  proveedor_id uuid references proveedores(id),
  costo numeric not null default 0,
  estado text not null default 'Activo' check (estado in ('Activo', 'Inactivo')),
  actualizacion date not null default current_date,
  notas text,
  created_at timestamptz not null default now()
);

create table if not exists materiales (
  id uuid primary key default gen_random_uuid(),
  codigo text,
  nombre text not null,
  categoria text,
  custodio text,
  valor_reposicion numeric not null default 0,
  vida_util_jornadas numeric not null default 1,
  estado text not null default 'Activo' check (estado in ('Activo', 'Inactivo')),
  notas text,
  created_at timestamptz not null default now()
);

create table if not exists profesionales (
  id uuid primary key default gen_random_uuid(),
  documento text,
  nombre text not null,
  ciudad text,
  perfil text,
  especialidad text,
  tarifa_hora numeric,
  jornada numeric,
  tipo_vinculo text,
  estado text not null default 'Activo' check (estado in ('Activo', 'Inactivo')),
  notas text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. Módulo Gestión — cotizaciones, proyectos, presupuestos, compras
-- ---------------------------------------------------------------------
create table if not exists cotizaciones (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  cliente_id uuid references clientes(id),
  nombre text not null,
  valor_total numeric not null default 0,
  estado text not null default 'Borrador' check (estado in ('Borrador', 'Aprobada', 'Rechazada')),
  creado_por uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists proyectos (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  cotizacion_id uuid references cotizaciones(id),
  nombre text not null,
  cliente_id uuid references clientes(id),
  responsable_id uuid references profiles(id),
  presupuesto_directo numeric not null default 0,
  admin_pct numeric,
  margen_pct numeric not null default 30,
  contrato_valor numeric not null default 0,
  iva_aplica boolean not null default false,
  iva_pct numeric not null default 19,
  contrato_incluye_iva boolean not null default true,
  retencion_pct numeric not null default 0,
  ica_pct numeric not null default 0,
  otras_retenciones numeric not null default 0,
  fecha_inicio date,
  fecha_fin date,
  estado text not null default 'Planeado' check (estado in ('Planeado', 'En ejecucion', 'Finalizado', 'Cancelado')),
  notas text,
  archivado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_proyectos_updated_at on proyectos;
create trigger trg_proyectos_updated_at before update on proyectos
  for each row execute function set_updated_at();

create table if not exists presupuesto_items (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references proyectos(id) on delete cascade,
  recurso text not null,
  cantidad numeric not null default 1,
  unidad text,
  valor_unitario numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists compras (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid references proyectos(id),
  proveedor_id uuid references proveedores(id),
  insumo_id uuid references insumos(id),
  fecha date not null default current_date,
  unidad text,
  cantidad numeric not null default 1,
  valor_unitario numeric not null default 0,
  valor_pagado numeric not null default 0,
  estado_pago text not null default 'Pendiente' check (estado_pago in ('Pendiente', 'Parcial', 'Pagado')),
  referencia text,
  categoria text,
  notas text,
  archivado boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  id int primary key default 1 check (id = 1),
  admin_pct numeric not null default 15,
  margin_pct numeric not null default 30,
  iva_pct numeric not null default 19,
  monthly_expenses numeric not null default 0,
  monthly_income numeric not null default 0,
  updated_at timestamptz not null default now()
);
insert into settings (id) values (1) on conflict (id) do nothing;
drop trigger if exists trg_settings_updated_at on settings;
create trigger trg_settings_updated_at before update on settings
  for each row execute function set_updated_at();

alter table settings enable row level security;
drop policy if exists "gestion: leer parámetros financieros" on settings;
create policy "gestion: leer parámetros financieros" on settings
  for select using (has_module('gestion'));
drop policy if exists "gestion: solo admin edita parámetros financieros" on settings;
create policy "gestion: solo admin edita parámetros financieros" on settings
  for update using (is_admin());

alter table clientes enable row level security;
alter table empresas_atendidas enable row level security;
alter table proveedores enable row level security;
alter table insumos enable row level security;
alter table materiales enable row level security;
alter table profesionales enable row level security;
alter table cotizaciones enable row level security;
alter table proyectos enable row level security;
alter table presupuesto_items enable row level security;
alter table compras enable row level security;
-- settings ya quedó con RLS habilitado y sus propias políticas justo después de crearla.

do $$
declare
  t text;
begin
  foreach t in array array[
    'clientes', 'empresas_atendidas', 'proveedores', 'insumos', 'materiales',
    'profesionales', 'cotizaciones', 'proyectos', 'presupuesto_items', 'compras'
  ]
  loop
    execute format('drop policy if exists "gestion: acceso por módulo" on %I', t);
    execute format(
      'create policy "gestion: acceso por módulo" on %I for all using (has_module(''gestion'')) with check (has_module(''gestion''))',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 5. Primer administrador
-- ---------------------------------------------------------------------
-- Después de crear tu cuenta (Authentication > Users > Add user, o
-- registrándote desde /login una vez esté conectado), corre esto
-- reemplazando el correo para quedar como admin con acceso a todo:
--
-- update profiles set role = 'admin', modules = '{seguimiento,gestion}'
-- where email = 'tu-correo@dpingenieriaintegral.com';
