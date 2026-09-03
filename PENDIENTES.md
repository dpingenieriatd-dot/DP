# Pendientes por decisión de negocio

Cosas que **no** son bugs de código sino decisiones que D&P (Angélica / Cesar)
tiene que tomar. Cuando se decidan, se implementan y se quitan de aquí.

---

## 1. ¿Qué manda: el `valor_cotizado` de la cotización o el del presupuesto?

**Estado:** abierto · detectado 2026-09-03

**El problema.** Al aprobar una cotización, su `valor_cotizado` se copia al
presupuesto. Pero el presupuesto tiene un campo **editable** «Valor cotizado al
cliente», así que después puede quedar distinto:

| | valor en la cotización | valor en el presupuesto |
|---|--:|--:|
| COT-413 | 3.799.266 | 3.800.000 (redondeado a mano) |
| COT-517 | 31.390.360 | 33.600.000 (cambiado a mano, +2,2 M) |
| COT-532 | 26.824.000 | 26.824.000 (igual) |

Hoy conviven los dos: el **tablero Control de proyectos**, la **ficha del
proyecto**, la **ganancia** y los **reportes** usan el del **presupuesto**; la
**lista de Cotizaciones** y el **PDF que se manda al cliente** usan el de la
**cotización**. No hay ninguna señal de cuál es el correcto (salvo un aviso
«Difiere de la cotización» que se agregó en la ficha del presupuesto).

**Las dos opciones:**

- **A — La cotización aprobada es intocable.** El `valor_cotizado` del
  presupuesto se bloquea (solo lectura, = el de la cotización). Si el cliente
  negocia otro valor, se hace una cotización nueva o se reabre la cotización.
  *Más estricto, una sola fuente de verdad.*

- **B — El presupuesto manda.** El `valor_cotizado` del presupuesto es «el valor
  del contrato realmente firmado» y puede diferir de la cotización (que queda
  como la oferta inicial). La lista de Cotizaciones y el PDF deberían mostrar
  entonces el valor del contrato cuando exista, no el de la cotización.
  *Más flexible, refleja la negociación real.*

**Qué falta:** que D&P diga A o B. Según eso: bloquear el campo (A) o cambiar
qué valor muestran la lista de Cotizaciones y el PDF (B).

---

## Resueltos (histórico corto)

- **2026-09-03** — El presupuesto no heredaba `admin_pct` / `margen_pct` /
  `iva_pct` de la cotización → nacía con 15/30/19. Arreglado: el seed ahora los
  copia (`migration_44`), y el tablero calcula admin e IVA por presupuesto (con
  `iva_monto`), no con un % del primer presupuesto sobre el plan total.
