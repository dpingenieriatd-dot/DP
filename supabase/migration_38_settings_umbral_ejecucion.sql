-- Umbral (%) de ejecución del presupuesto a partir del cual un proyecto pasa a
-- "atención" (amarillo) en el tablero de Control de proyectos del Inicio de
-- Gestión. Editable por la Directora desde Parámetros, sin desarrollador.
-- El rojo no usa este umbral: se dispara al 100% o si la ganancia real es negativa.
alter table settings add column if not exists umbral_ejecucion_pct numeric not null default 80;
