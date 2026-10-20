-- ==========================================================
-- Actualización 001 — Libro de Reclamaciones de Hervor
-- Ejecutar UNA vez en Supabase → SQL Editor → New query → Run
-- Hace que el orden de los números de hoja coincida siempre con el de la hora.
-- No borra ni modifica ningún reclamo.
-- ==========================================================

drop function if exists public.registrar_reclamo(jsonb, timestamptz, date);

-- ----------------------------------------------------------
-- Registra una hoja de forma ATÓMICA:
--  * un bloqueo de transacción serializa los envíos simultáneos;
--  * la fecha y hora se toman DESPUÉS del bloqueo, así el orden de los
--    números coincide siempre con el orden de la hora;
--  * contador del año + registro en la misma transacción: si algo falla
--    se revierte todo → sin saltos ni duplicados.
-- p_limites: fecha límite de respuesta por fecha de registro (hora de Lima),
--   p. ej. {"2026-10-20": "2026-11-10", "2026-10-21": "2026-11-11"}.
--   La calcula el backend (feriados de Perú) para hoy y mañana.
-- ----------------------------------------------------------
create or replace function public.registrar_reclamo(p jsonb, p_limites jsonb)
returns table (numero_hoja text, correlativo integer, creado_en timestamptz, fecha_limite_respuesta date)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_ahora  timestamptz;
  v_fecha  date;
  v_anio   integer;
  v_limite date;
  v_n      integer;
  v_num    text;
begin
  perform pg_advisory_xact_lock(hashtext('hervor.registrar_reclamo'));

  v_ahora  := clock_timestamp();
  v_fecha  := (v_ahora at time zone 'America/Lima')::date;
  v_anio   := extract(year from v_fecha)::integer;
  v_limite := (p_limites ->> v_fecha::text)::date;
  if v_limite is null then
    raise exception 'Falta la fecha límite de respuesta para %', v_fecha;
  end if;

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
    v_num, v_anio, v_n, v_ahora, v_limite,
    p->>'consumidor_nombre', p->>'tipo_documento', p->>'numero_documento', p->>'domicilio',
    p->>'telefono', p->>'email',
    coalesce((p->>'es_menor')::boolean, false), nullif(p->>'apoderado_nombre', ''),
    p->>'bien_tipo', nullif(p->>'monto_reclamado', '')::numeric, p->>'bien_descripcion',
    p->>'tipo', p->>'detalle', p->>'pedido',
    (p->>'declara_veracidad')::boolean, (p->>'acepta_tratamiento_datos')::boolean,
    p->>'ip_hash', p->>'user_agent'
  );

  return query select v_num, v_n, v_ahora, v_limite;
end;
$$;

-- La función solo la puede ejecutar el backend
revoke all on function public.registrar_reclamo(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.registrar_reclamo(jsonb, jsonb) to service_role;
