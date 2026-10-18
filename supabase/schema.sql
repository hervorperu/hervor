-- ==========================================================
-- Libro de Reclamaciones Virtual — Hervor
-- Ejecutar una sola vez en Supabase → SQL Editor → New query → Run
-- ==========================================================

-- Contador correlativo por año (una fila por año)
create table if not exists public.contadores_hoja (
  anio   integer primary key,
  ultimo integer not null default 0
);

-- Hojas de reclamación
create table if not exists public.reclamos (
  id                        bigint generated always as identity primary key,
  numero_hoja               text        not null unique,          -- 0001-2026
  anio                      integer     not null,
  correlativo               integer     not null,
  creado_en                 timestamptz not null,
  fecha_limite_respuesta    date        not null,

  -- 1. Identificación del consumidor
  consumidor_nombre         text        not null,
  tipo_documento            text        not null check (tipo_documento in ('DNI', 'CE')),
  numero_documento          text        not null,
  domicilio                 text        not null,
  telefono                  text        not null,
  email                     text        not null,
  es_menor                  boolean     not null default false,
  apoderado_nombre          text,

  -- 2. Identificación del bien contratado
  bien_tipo                 text        not null check (bien_tipo in ('Producto', 'Servicio')),
  monto_reclamado           numeric(12, 2),
  bien_descripcion          text        not null,

  -- 3. Detalle de la reclamación
  tipo                      text        not null check (tipo in ('Reclamo', 'Queja')),
  detalle                   text        not null,
  pedido                    text        not null,
  declara_veracidad         boolean     not null check (declara_veracidad),
  acepta_tratamiento_datos  boolean     not null check (acepta_tratamiento_datos),

  -- 4. Observaciones y acciones adoptadas por el proveedor (lo completa Hervor)
  respuesta                 text,
  fecha_respuesta           date,

  -- Control interno
  estado_correo_consumidor  text        not null default 'pendiente',  -- pendiente | enviado | error
  estado_correo_proveedor   text        not null default 'pendiente',
  intentos_correo           integer     not null default 0,
  ultimo_error              text,
  ip_hash                   text,
  user_agent                text,

  unique (anio, correlativo),
  constraint apoderado_si_menor check (not es_menor or coalesce(length(trim(apoderado_nombre)), 0) > 0)
);

create index if not exists reclamos_creado_en_idx on public.reclamos (creado_en desc);
create index if not exists reclamos_ip_idx on public.reclamos (ip_hash, creado_en);

-- Solo el backend (service_role) puede leer/escribir. Sin políticas = acceso público denegado.
alter table public.reclamos enable row level security;
alter table public.contadores_hoja enable row level security;

-- ----------------------------------------------------------
-- Registra una hoja de forma ATÓMICA:
-- incrementa el contador del año y crea el registro en la misma
-- transacción. Si algo falla, se revierte todo → sin saltos ni duplicados.
-- El bloqueo de fila del contador serializa envíos simultáneos.
-- ----------------------------------------------------------
create or replace function public.registrar_reclamo(p jsonb, p_creado_en timestamptz, p_fecha_limite date)
returns table (numero_hoja text, correlativo integer, creado_en timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_anio integer := extract(year from (p_creado_en at time zone 'America/Lima'))::integer;
  v_n    integer;
  v_num  text;
begin
  insert into contadores_hoja as c (anio, ultimo)
  values (v_anio, 1)
  on conflict (anio) do update set ultimo = c.ultimo + 1
  returning c.ultimo into v_n;

  v_num := lpad(v_n::text, 4, '0') || '-' || v_anio::text;

  insert into reclamos (
    numero_hoja, anio, correlativo, creado_en, fecha_limite_respuesta,
    consumidor_nombre, tipo_documento, numero_documento, domicilio, telefono, email,
    es_menor, apoderado_nombre,
    bien_tipo, monto_reclamado, bien_descripcion,
    tipo, detalle, pedido, declara_veracidad, acepta_tratamiento_datos,
    ip_hash, user_agent
  ) values (
    v_num, v_anio, v_n, p_creado_en, p_fecha_limite,
    p->>'consumidor_nombre', p->>'tipo_documento', p->>'numero_documento', p->>'domicilio',
    p->>'telefono', p->>'email',
    coalesce((p->>'es_menor')::boolean, false), nullif(p->>'apoderado_nombre', ''),
    p->>'bien_tipo', nullif(p->>'monto_reclamado', '')::numeric, p->>'bien_descripcion',
    p->>'tipo', p->>'detalle', p->>'pedido',
    (p->>'declara_veracidad')::boolean, (p->>'acepta_tratamiento_datos')::boolean,
    p->>'ip_hash', p->>'user_agent'
  );

  return query select v_num, v_n, p_creado_en;
end;
$$;

-- La función solo la puede ejecutar el backend
revoke all on function public.registrar_reclamo(jsonb, timestamptz, date) from public, anon, authenticated;
grant execute on function public.registrar_reclamo(jsonb, timestamptz, date) to service_role;
