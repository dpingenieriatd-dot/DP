-- Migration 05: cliente_id / proyecto_id reales en tareas, agenda_bloques y actividades
--
-- Hoy estas tres tablas guardan "cliente" como texto libre (sin relacion con la
-- tabla clientes ni proyectos). Se agregan columnas FK nuevas y se intenta
-- rellenarlas automaticamente haciendo match por nombre contra los registros
-- existentes de clientes/proyectos. Las columnas de texto viejas se conservan
-- (no se borran datos) para los casos que no matchearon — se pueden revisar y
-- limpiar manualmente despues desde la propia app una vez tenga los dropdowns.

alter table tareas add column if not exists cliente_id uuid references clientes(id);
alter table tareas add column if not exists proyecto_id uuid references proyectos(id);

alter table agenda_bloques add column if not exists cliente_id uuid references clientes(id);
alter table agenda_bloques add column if not exists proyecto_id uuid references proyectos(id);

alter table actividades add column if not exists cliente_id uuid references clientes(id);
alter table actividades add column if not exists proyecto_id uuid references proyectos(id);

-- Backfill: match por nombre (case-insensitive, sin espacios extra) contra clientes
update tareas t
set cliente_id = c.id
from clientes c
where t.cliente_id is null
  and t.cliente is not null
  and trim(lower(t.cliente)) = trim(lower(c.nombre));

update agenda_bloques a
set cliente_id = c.id
from clientes c
where a.cliente_id is null
  and a.cliente is not null
  and trim(lower(a.cliente)) = trim(lower(c.nombre));

update actividades a
set cliente_id = c.id
from clientes c
where a.cliente_id is null
  and a.cliente is not null
  and trim(lower(a.cliente)) = trim(lower(c.nombre));

-- Backfill: match por nombre contra proyectos (por si el texto libre traia el
-- nombre del proyecto en vez del cliente)
update tareas t
set proyecto_id = p.id
from proyectos p
where t.proyecto_id is null
  and t.cliente_id is null
  and t.cliente is not null
  and trim(lower(t.cliente)) = trim(lower(p.nombre));

update agenda_bloques a
set proyecto_id = p.id
from proyectos p
where a.proyecto_id is null
  and a.cliente_id is null
  and a.cliente is not null
  and trim(lower(a.cliente)) = trim(lower(p.nombre));
