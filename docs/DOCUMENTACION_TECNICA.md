# Documentación técnica — Plataforma interna D&P

Documento de referencia para el desarrollador que retome, mantenga o audite la plataforma interna de D&P Ingeniería Integral S.A.S. Describe cómo está construida, dónde vive cada pieza y cómo se opera. Para el uso funcional (pantallas, flujos), ver el manual de usuario en `/manual.html`.

Última actualización: 19/10/2026.

---

## 1. Resumen

| | |
|---|---|
| **Qué es** | Aplicación web interna: Seguimiento del equipo + Gestión de proyectos + Reportes + Administración. |
| **URL de producción** | <https://app.dpingenieriaintegral.com> |
| **Repositorio** | `github.com/dpingenieriatd-dot/DP` (rama `master`) |
| **Hosting** | Vercel — equipo "DP", proyecto `dp`. Despliegue automático en cada push a `master`. |
| **Base de datos y login** | Supabase (Postgres + Auth + Row Level Security). |
| **Correo** | Resend (resumen semanal a administradores y avisos de soporte). Los correos de login/recuperación los envía Supabase Auth. |

## 2. Tecnologías

| Pieza | Versión | Uso |
|---|---|---|
| Next.js (App Router) | 16.3.0 | Framework web, páginas del servidor, Server Actions, rutas API. |
| React | 19.2 | Interfaz. |
| TypeScript | 5 | Tipado de todo el código. |
| Tailwind CSS | 4 | Estilos (tokens de color/tema en `src/app/globals.css`). |
| `@supabase/ssr`, `@supabase/supabase-js` | 0.12 / 2.x | Cliente de base de datos y sesión. |
| `@react-pdf/renderer` | 4 | Generación de PDF en el servidor (reportes, cotizaciones, control de proyectos). |
| `recharts` | 3 | Gráficas del tablero de Inicio. |
| `lucide-react` | 1 | Íconos. |

Node.js 20.9 o superior.

> **Importante — Next.js 16:** cambia convenciones respecto a versiones anteriores (por ejemplo, el antiguo `middleware.ts` ahora es `src/proxy.ts`). La documentación de la versión instalada está en `node_modules/next/dist/docs/`.

## 3. Estructura del código

```
src/
  proxy.ts                     Protege las rutas: sin sesión → /login
  app/
    login/                     Inicio de sesión
    recuperar-password/        Solicitud de recuperación de contraseña (pública)
    auth/callback/             Retorno de los enlaces de correo de Supabase (pública)
    cuenta/password/           Cambio de contraseña del usuario
    (app)/                     Rutas autenticadas, con menú lateral (shell.tsx)
      page.tsx                 Inicio: tablero con KPI y gráficas
      seguimiento/             tareas, agendas, capacidad, efectividad,
                               actividades, procesos, historial
      gestion/                 cotizaciones, proyectos, presupuestos, compras,
                               proveedores, clientes, empresas, materiales,
                               profesionales, insumos
      reportes/                Catálogo de reportes PDF + reportes personalizados
      admin/                   usuarios, parametros, temas, auditoria, soporte
    api/
      reportes/[slug]/         PDF de cada reporte (con filtros opcionales)
      cotizaciones/[id]/pdf/   PDF de la cotización para el cliente
      gestion/control-proyectos/pdf/   PDF del tablero Control de proyectos
      cron/resumen-semanal/    Correo semanal a administradores (Vercel Cron)
  components/                  Componentes compartidos (tabla CRUD, KPI,
                               campana de notificaciones, presencia, etc.)
  lib/
    supabase/                  Clientes de Supabase (navegador, servidor, admin)
                               y refresco de sesión
    pdf/                       Plantillas PDF (tabla genérica, cotización)
    finance.ts                 Cálculos financieros (costos, márgenes, IVA,
                               retenciones, utilidad)
    control-proyectos.ts       Datos del tablero Control de proyectos
    dashboard-data.ts          Datos del tablero de Inicio
    ...                        Utilidades varias (semanas, meses, códigos, etc.)
supabase/                      Esquema SQL y migraciones (ver sección 6)
public/                        Logo, íconos, manifest y manual de usuario
scripts/                       Generación de la Guía de Usuario (PDF/Word)
vercel.json                    Programación del cron semanal
```

Patrón general: las páginas son **Server Components** que leen de Supabase con la sesión del usuario; las escrituras se hacen con **Server Actions** (`actions.ts` junto a cada página). Toda consulta pasa por las políticas RLS de la base de datos, así que una página no puede mostrar algo que el usuario no tenga permitido aunque el código lo pida.

## 4. Usuarios, roles y permisos

- Cada usuario de Supabase Auth tiene una fila en `profiles` (se crea sola con el trigger `handle_new_user`).
- `profiles.role`: `admin` o `member`.
- `profiles.modules`: lista de módulos habilitados — `seguimiento` y/o `gestion`.
- `profiles.activo`: permite desactivar a un usuario sin borrarlo.
- Funciones SQL de permisos, usadas por todas las políticas RLS:
  - `is_admin()` — el usuario actual es administrador.
  - `has_module('seguimiento' | 'gestion')` — el usuario es admin o tiene ese módulo.
- Los administradores invitan usuarios desde **Administración → Usuarios**. La invitación usa `src/lib/supabase/admin.ts` (llave `service_role`, solo en el servidor) y Supabase envía el correo con el enlace de registro.
- Las Server Actions de administrador verifican de nuevo el rol (`requiereAdmin()` en `src/lib/auth.ts`), porque una Server Action se puede invocar directamente aunque la página esté oculta.

## 5. Modelo de datos

Todas las tablas tienen Row Level Security activado. Resumen por área:

| Área | Tablas |
|---|---|
| Usuarios y configuración | `profiles`, `settings` (parámetros del negocio: admin %, margen %, IVA %, umbrales), `efectividad_parametros`, `app_config` (tema de color) |
| Seguimiento | `tareas`, `registros_tiempo` (cronómetro), `agenda_bloques`, `actividades`, `catalogo_actividades`, `procesos` |
| Gestión — comercial | `clientes`, `empresas_atendidas`, `cotizaciones`, `cotizacion_items`, `cotizacion_soportes`, `cotizacion_enlaces`, `cotizaciones_codigos_usados` |
| Gestión — ejecución | `proyectos`, `presupuestos`, `presupuesto_items`, `presupuesto_costos`, `compras`, `proveedores` |
| Catálogos | `materiales`, `profesionales`, `insumos` |
| Operación | `notificaciones`, `auditoria`, `soporte_tickets` |

Flujo principal de Gestión: **cotización → aprobación → proyecto → presupuesto → compras**. Al aprobar una cotización se crea el proyecto y su presupuesto, heredando porcentajes (admin, margen, IVA) e ítems. Los cálculos de dinero están centralizados en `src/lib/finance.ts`.

Funciones y disparadores relevantes:

| Función | Para qué |
|---|---|
| `handle_new_user` | Crea el perfil al registrarse un usuario. |
| `fn_registrar_auditoria` | Registra en `auditoria` los cambios de las tablas principales. |
| `guard_tareas_*`, `guard_agenda_bloques_responsable` | Impiden que un usuario no administrador cambie campos que no le corresponden. |
| `guardar_codigo_cotizacion_liberado` | Evita reutilizar códigos de cotización eliminados. |
| `actualizar_last_seen`, `actualizar_preferencias_recordatorio` | El usuario actualiza solo su propia presencia y preferencias. |

Tarea programada en la base de datos (`pg_cron`): `auditoria-retencion-12m` borra registros de auditoría con más de 12 meses (`migration_50`).

## 6. Base de datos: esquema y migraciones

La carpeta `supabase/` contiene el historial de cambios del esquema como scripts SQL, que se ejecutan a mano en **Supabase → SQL Editor**. No se usa la CLI de Supabase.

Orden para reconstruir la base desde cero:

1. `schema.sql` — esquema base, funciones de permisos y políticas.
2. `migration_02b_correr_esto.sql` — versión definitiva de la migración 02 (no correr `migration_02_modelo_real.sql`, quedó reemplazada).
3. `migration_03_datos_reales.sql` — **carga de datos históricos de D&P**. Omitir si se quiere una base vacía.
4. `migration_04_...` hasta `migration_56_...`, en orden numérico (incluyendo las variantes `b`/`c`, por ejemplo `08`, `08b`, `09`, `09b`, `09c`).

Los scripts están escritos para poder correrse más de una vez sin romper nada (`if not exists`, `create or replace`).

> **Sin verificar:** la reconstrucción completa desde una base vacía siguiendo este orden no se ha ensayado de punta a punta; las migraciones se aplicaron una a una sobre la base de producción. Para una copia exacta de la base actual, lo más confiable es un respaldo desde Supabase (ver sección 9).

Para cualquier cambio nuevo: crear `migration_57_<descripcion>.sql`, correrlo en Supabase y subirlo al repositorio en el mismo commit que el código que lo necesita.

## 7. Variables de entorno

Se configuran en `.env.local` (desarrollo) y en **Vercel → Project → Settings → Environment Variables** (producción). La plantilla comentada es `.env.example`. **Nunca** se suben al repositorio.

| Variable | Obligatoria | Dónde se obtiene | Uso |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | Supabase → Project Settings → API | Conexión a la base. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Supabase → Project Settings → API | Llave pública (protegida por RLS). |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí (para invitar usuarios) | Supabase → Project Settings → API | Solo servidor. Invitación de usuarios. **Secreta.** |
| `RESEND_API_KEY` | Para correos | resend.com → API Keys | Resumen semanal y avisos de soporte. **Secreta.** |
| `CRON_SECRET` | Para el cron | Cadena aleatoria propia | Autentica la llamada de Vercel Cron. **Secreta.** |
| `NEXT_PUBLIC_SITE_URL` | No | — | Enlace "Abrir la plataforma" del correo semanal. |
| `SOPORTE_EMAIL` | No | — | Destino de los reportes de soporte técnico. |
| `RESUMEN_REMITENTE` | No | — | Remitente de los correos de Resend. |

Si faltan las variables de Supabase, la app falla con: `Your project's URL and Key are required to create a Supabase client!`

## 8. Despliegue

- Vercel compila y publica automáticamente cada push a `master` (integración con GitHub). No hay pasos manuales.
- Antes de subir: `npm run lint` y `npm run build` sin errores.
- Si un cambio necesita una migración, correrla en Supabase **antes** de subir el código.
- Cron (`vercel.json`): `/api/cron/resumen-semanal` los lunes a las 13:00 UTC (8:00 a. m. Bogotá). Vercel envía el `CRON_SECRET` en el encabezado.
- Dominio: `app.dpingenieriaintegral.com` está configurado en Vercel. Si cambia, actualizar también `NEXT_PUBLIC_SITE_URL` y, en Supabase → Authentication → URL Configuration, la *Site URL* y las *Redirect URLs* (`https://<dominio>/auth/callback`).
- Revertir: en Vercel → Deployments, elegir un despliegue anterior → *Promote to Production*.

## 9. Operación y mantenimiento

- **Respaldos:** Supabase hace respaldos automáticos según el plan contratado. Para una copia propia: Supabase → Database → Backups, o `pg_dump` con la cadena de conexión del proyecto.
- **Errores en producción:** Vercel → proyecto → Logs.
- **Usuarios:** alta, módulos y desactivación desde Administración → Usuarios (no hace falta un desarrollador).
- **Parámetros del negocio** (porcentajes, umbrales, pesos de efectividad): Administración → Parámetros.
- **Auditoría:** Administración → Auditoría muestra quién cambió qué y cuándo (12 meses).
- **Correo de login/recuperación:** lo envía Supabase Auth. Para volumen real debe configurarse SMTP propio (Supabase → Authentication → SMTP Settings, con Resend: host `smtp.resend.com`, puerto 465, usuario `resend`, contraseña = API key).

## 10. Seguridad

- El aislamiento de datos se hace en la base de datos (RLS), no solo en la interfaz.
- La llave `service_role` y las demás llaves secretas solo existen en el servidor (Vercel y `.env.local`), nunca en el navegador ni en el repositorio.
- Rutas públicas sin sesión: solo `/login`, `/recuperar-password`, `/auth/callback` y `/api/cron/` (esta última se autentica con `CRON_SECRET` dentro de la ruta). Ver `src/lib/supabase/middleware.ts`.
- Al cambiar de responsable técnico o al transferir las cuentas, **rotar** las llaves secretas: `SUPABASE_SERVICE_ROLE_KEY` (o las nuevas *secret keys* de Supabase), `RESEND_API_KEY` y `CRON_SECRET`, y actualizarlas en Vercel.

## 11. Cuentas y servicios

| Servicio | Cuenta | Para qué |
|---|---|---|
| GitHub | `dpingenieriatd-dot` | Código fuente e historial de cambios. |
| Vercel | Equipo "DP" | Hosting, dominio, cron, variables de entorno. |
| Supabase | Proyecto de la plataforma | Base de datos, login, respaldos. |
| Resend | Dominio `dpingenieriaintegral.com` | Envío de correos. |

La titularidad y el calendario de entrega de estas cuentas se rigen por el Acta de Entrega del Código Fuente.
