# D&P Ingeniería Integral — Plataforma interna

Plataforma web interna de D&P Ingeniería Integral S.A.S. (Fase 1 de la transformación digital): **Seguimiento** operativo del equipo (tareas, agendas, capacidad, efectividad, procesos, historial) y **Gestión** de proyectos (cotizaciones, proyectos, presupuestos, compras, proveedores y catálogos), con reportes en PDF, panel de administración y acceso por persona según su cargo.

En producción: <https://app.dpingenieriaintegral.com>

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Supabase (Postgres, Auth, Row Level Security), desplegado en Vercel.

## Correr localmente

Requisitos: Node.js 20.9 o superior y acceso a un proyecto de Supabase.

```bash
npm install
cp .env.example .env.local   # completar con las llaves (ver comentarios del archivo)
npm run dev
```

Abrir <http://localhost:3000>.

Otros comandos:

| Comando | Para qué |
|---|---|
| `npm run build` | Compila la versión de producción (también revisa tipos). |
| `npm run start` | Sirve la versión compilada. |
| `npm run lint` | Revisa el código con ESLint. |

## Documentación

- **[`docs/DOCUMENTACION_TECNICA.md`](docs/DOCUMENTACION_TECNICA.md)** — arquitectura, modelo de datos, seguridad, variables de entorno, base de datos y migraciones, despliegue y operación. Es el documento de referencia para cualquier desarrollador que retome el proyecto.
- **Manual de usuario** — publicado en la propia plataforma en `/manual.html` (fuente: `public/manual.html`).
- **[`PENDIENTES.md`](PENDIENTES.md)** — decisiones de negocio abiertas que afectan el código.

## Notas técnicas

- Este proyecto usa Next.js 16, que cambia varias convenciones frente a versiones anteriores (por ejemplo `middleware.ts` → `proxy.ts`). Antes de asumir un patrón de una versión anterior, revisar `node_modules/next/dist/docs/`.
- La anon key de Supabase es segura de exponer en el navegador (`NEXT_PUBLIC_...`); el aislamiento real de datos lo hace Row Level Security en la base de datos. La `SUPABASE_SERVICE_ROLE_KEY` **nunca** debe llevar el prefijo `NEXT_PUBLIC_` ni subirse al repositorio.
- Los archivos `.env*` (salvo `.env.example`) están excluidos del repositorio por `.gitignore`.

## Propiedad

Código desarrollado para D&P Ingeniería Integral S.A.S. por César Rivas. Ver el Acta de Entrega del Código Fuente para los términos de entrega y cesión.
