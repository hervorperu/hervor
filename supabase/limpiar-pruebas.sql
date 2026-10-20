-- ==========================================================
-- Limpiar las hojas de PRUEBA — Libro de Reclamaciones de Hervor
-- Ejecutar en Supabase → SQL Editor → New query → Run
-- SOLO borra las hojas cuyo nombre empieza por "PRUEBA" y deja el contador
-- como si no hubieran existido, para que el primer reclamo real sea 0001.
-- ⚠️ No lo uses cuando ya existan reclamos reales mezclados con pruebas.
-- ==========================================================

begin;

delete from public.reclamos where consumidor_nombre like 'PRUEBA %';

-- El contador de cada año vuelve al último número que quede (0 si no queda ninguno)
update public.contadores_hoja c
set ultimo = coalesce((select max(r.correlativo) from public.reclamos r where r.anio = c.anio), 0);

commit;

-- Comprobación: debe mostrar 0 hojas de prueba
select count(*) as hojas_de_prueba_restantes from public.reclamos where consumidor_nombre like 'PRUEBA %';
