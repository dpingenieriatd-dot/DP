-- Migration 07: 4 paletas nuevas para el selector de temas
--
-- Amplia el check constraint de app_config.tema para permitir las 4
-- combinaciones nuevas, elegidas por colorimetria respecto al verde del
-- logo (hue ~90deg): violeta (complementario, ~268deg), vino (~340deg),
-- terracota (~18deg, ligada a materiales de construccion/ingenieria) y
-- grafito (neutro de baja saturacion, deja que el logo sea el unico
-- acento de color). Contraste WCAG AA verificado en cada una (ver
-- globals.css) antes de agregarlas aqui.

alter table app_config drop constraint if exists app_config_tema_check;
alter table app_config add constraint app_config_tema_check
  check (tema in ('verde', 'azul', 'violeta', 'vino', 'terracota', 'grafito'));
