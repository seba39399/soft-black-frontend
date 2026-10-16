# Arquitectura y convenciones — soft-black-frontend

Frontend de dashboards internos: Next.js 16.2.6, React 19.2.4, TypeScript strict, Tailwind v4, Amplify 6.22.0 (Cognito). Node 22.15.1.

## Reglas obligatorias

- `src/app/` **solo enruta**. Un `page.tsx` importa y renderiza el componente principal de `src/features/<nombre>/`. Sin lógica, sin fetch.
- Ruta privada, feature y clave de `NAV_ITEMS` se llaman **igual**: `src/app/(dashboard)/<nombre>/` ↔ `src/features/<nombre>/`.
- Dentro del feature: `components/` (.tsx, uno por archivo), `utils/` (.ts sin JSX), `types.ts` (tipos de respuestas del dominio).
- Un feature de negocio **no importa** de otro feature de negocio.
- Toda llamada a la API pasa por `apiFetch` (`src/lib/api-client.ts`) desde `src/features/<nombre>/utils/<nombre>-api.ts`. Nunca `fetch` directo.
- Pantallas con datos: usar `useApiQuery` y manejar los cuatro estados con `Spinner`, `ErrorState`, `EmptyState` (en `src/components/ui/`) y los datos. Dentro de una pantalla los títulos empiezan en `<h2>` (el `<h1>` lo pone el header).
- El nombre visible de la app vive solo en `src/lib/app-config.ts`.
- El menú sale de `NAV_ITEMS` vía `catalogNavItems()`. El login es opcional: las rutas están abiertas.
- UI en español. Sin `any`. Imports con `@/`.

## Next.js 16 (breaking changes)

- No uses conocimiento de Next ≤15 sin verificar. Consulta `node_modules/next/dist/docs/`.
- `middleware.ts` ya no existe: es `src/proxy.ts` con la función `proxy`.
- **Nunca** agregues `export const runtime` en `proxy.ts` (corre en Node por defecto; declararlo lanza error).
- El `matcher` de `proxy.ts` no se modifica al agregar dashboards. El proxy deja pasar las rutas: el login es opcional.
- Las variables `NEXT_PUBLIC_*` se leen **literalmente** (`process.env.NEXT_PUBLIC_X`), nunca con `process.env[clave]`.

## Antes de dar una tarea por terminada

`npm run verify` sin errores (lint + typecheck + tests + build). Si cambiaste un comportamiento documentado, actualiza el doc en el mismo cambio.

## Detalle

- `docs/02-arquitectura.md`
- `docs/05-convenciones-y-testing.md`
