-- =========================================================================
-- Migración 53 — Fase 2.2: unificar las categorías de Compras con el Plan de costos
--
-- Compras y presupuesto_costos tenían listas de categorías distintas, así
-- que no se podía comparar planeado vs. gastado por categoría. Ahora las dos
-- usan la misma lista (la que ya tenía presupuesto_costos).
--
-- Limpieza: casi todo el dato viejo de compras.categoria son nombres de
-- personas o valores vacíos, en compras archivadas (invisibles). Se llevan a
-- "Otros costos" para poder validar. Las 2 compras activas ("Materiales e
-- insumos") pasan a "Compras / insumos".
-- =========================================================================

-- Las que sí tienen un equivalente claro.
update compras set categoria = 'Compras / insumos'         where categoria = 'Materiales e insumos';
update compras set categoria = 'Servicios / profesionales' where categoria = 'Servicios profesionales';
update compras set categoria = 'Transporte / logistica'    where categoria in ('Transporte y logística', 'Transporte y logistica');
update compras set categoria = 'Viáticos'                   where categoria = 'Alimentación';
update compras set categoria = 'Otros costos'               where categoria = 'Publicidad y diseño';

-- Todo lo demás (nombres, "Otros", NULL) -> "Otros costos".
update compras
set categoria = 'Otros costos'
where categoria is null
   or categoria not in (
     'Compras / insumos', 'Servicios / profesionales', 'Materiales / desgaste',
     'Transporte / logistica', 'Viáticos', 'Otros costos', 'Costos directos'
   );

alter table compras alter column categoria set default 'Otros costos';

alter table compras drop constraint if exists compras_categoria_check;
alter table compras add constraint compras_categoria_check check (categoria in (
  'Compras / insumos', 'Servicios / profesionales', 'Materiales / desgaste',
  'Transporte / logistica', 'Viáticos', 'Otros costos', 'Costos directos'
));
