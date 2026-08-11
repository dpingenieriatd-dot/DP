# D&P Ingeniería Integral — Plataforma interna

Fase 1 de la transformación digital de D&P Ingeniería Integral S.A.S.: Seguimiento operativo del equipo (tareas, agendas, capacidad, efectividad) y Gestión de proyectos (cotizaciones, presupuestos, compras, proveedores y catálogos), con datos centralizados y acceso por persona según su cargo.

Next.js (App Router) + TypeScript + Tailwind CSS + Supabase (Postgres, Auth, Row Level Security).

## Estado actual

Esqueleto técnico: rutas y navegación creadas, sin lógica de negocio ni conexión real a datos todavía. Falta:

- Proyecto de Supabase creado y llaves cargadas en `.env.local`.
- Respuestas de la Solicitud de Información (`Documentacion_Proyecto/03_...`), en particular el modelo de roles/permisos y el objetivo del control de tiempo, antes de construir el panel de administración y el módulo de Efectividad.
- Archivo `Seguimiento_V1.xlsx` con los datos reales del equipo, para reemplazar los datos de ejemplo.

## Correr localmente

```bash
npm install
cp .env.example .env.local   # completar con los datos del proyecto de Supabase
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Estructura

```
src/
  app/
    login/                  Inicio de sesión (fuera del layout con menú)
    (app)/                  Rutas autenticadas, con el menú lateral
      admin/                Usuarios, parámetros del negocio
      seguimiento/          Tareas, agendas, capacidad, efectividad
      gestion/              Cotizaciones, proyectos, presupuestos, compras,
                             proveedores, clientes, empresas, materiales,
                             profesionales, insumos
  lib/
    supabase/
      client.ts             Cliente de Supabase para Client Components
      server.ts              Cliente de Supabase para Server Components
      middleware.ts          Lógica de refresco de sesión, usada por proxy.ts
proxy.ts                     Protege las rutas autenticadas (antes "middleware.ts";
                              renombrado por el cambio de convención en Next.js 16)
```

## Notas técnicas

- Este proyecto usa Next.js 16, que tiene cambios importantes de convención frente a versiones anteriores (por ejemplo `middleware.ts` → `proxy.ts`). Antes de asumir un patrón de una versión anterior, revisar `node_modules/next/dist/docs/`.
- La anon key de Supabase es segura de exponer en el cliente (`NEXT_PUBLIC_...`); el aislamiento real de datos entre módulos y entre usuarios lo hace Row Level Security en la base de datos, no el secreto de esa llave.
- El resto de la documentación del proyecto (propuesta firmada, actas, cronograma, checklist QAQC, registro de riesgos) está en `../Documentacion_Proyecto/`.
