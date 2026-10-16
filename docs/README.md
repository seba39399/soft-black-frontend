# soft-black-frontend — Documentación

Plantilla base para construir **dashboards internos** con Next.js 16. El login contra **AWS Cognito** existe, pero **no es obligatorio**: la aplicación se recorre completa sin sesión. Trae resuelto el shell, el menú, la sesión opcional y el cliente HTTP.

> **¿Primera vez aquí?** Lee [`00-usar-la-plantilla.md`](./00-usar-la-plantilla.md). En unos 30 minutos tienes la plantilla corriendo con tu propio Cognito.
>
> **¿Vas a agregar una pantalla?** Sigue [`02-arquitectura.md` §5 — Agregar un dashboard](./02-arquitectura.md#5-agregar-un-dashboard-paso-a-paso).

---

## Mapa de la documentación

| # | Documento | Léelo cuando… |
|---|---|---|
| 00 | [Usar la plantilla](./00-usar-la-plantilla.md) | Vas a arrancar un proyecto nuevo desde esta base |
| 01 | [Visión y stack](./01-vision-y-stack.md) | Quieres saber qué es, con qué está hecho y qué **no** hace |
| 02 | [Arquitectura](./02-arquitectura.md) | Vas a crear o mover código (incluye *agregar un dashboard*) |
| 03 | [Autenticación](./03-autenticacion.md) | Tocas login, sesión, logout o `proxy.ts` |
| 04 | [Autorización por grupos](./04-autorizacion.md) | Cambias quién ve qué dashboard |
| 05 | [Convenciones y testing](./05-convenciones-y-testing.md) | Escribes cualquier código o test |
| 06 | [Entorno y despliegue](./06-entorno-y-deploy.md) | Instalas Node, configuras `.env.local` o despliegas |
| 07 | [Repos y contrato de API](./07-repos-y-contrato-api.md) | Una pantalla necesita datos del backend (errores, paginación por cursor, entornos) |
| 08 | [Git](./08-git.md) | Creas ramas, commits o PRs |
| 09 | [Troubleshooting](./09-troubleshooting.md) | Algo no funciona |
| 10 | [Trabajar con Cursor](./10-cursor.md) | Usas Cursor (reglas `.mdc` y skills) sobre este repo |

Anexos:

- [`agente/`](./agente/) — fuente de las reglas y procedimientos del agente (se copian a `.cursor/rules/`; la skill `/nuevo-dashboard` los leen).

---

## Reglas que no se negocian

1. **`src/app/` solo enruta.** La lógica vive en `src/features/<nombre>/` (ver [02](./02-arquitectura.md)).
2. **Ruta y feature se llaman igual.** `src/app/(dashboard)/reportes/` ↔ `src/features/reportes/`.
3. **Quién ve qué se define en un solo archivo:** `src/features/main-dashboard/utils/nav-config.ts` (ver [04](./04-autorizacion.md)).
4. **Toda llamada a la API pasa por `apiFetch`** (`src/lib/api-client.ts`). Nada de `fetch` sueltos.
5. **El login es opcional.** Las rutas del dashboard se sirven sin sesión. `proxy.ts` no redirige a `/login`. La API sigue exigiendo token en las llamadas de datos.
6. **Next.js 16 tiene breaking changes.** Ante la duda, la fuente es `node_modules/next/dist/docs/`, no un tutorial de Next 13–15.
7. **Si cambias el comportamiento, actualiza el doc** en el mismo commit.

---

## Versiones y mantenimiento de la plantilla

La plantilla se distribuye **copiando esta carpeta**. Su versión está en `package.json` → `version` y cada versión se describe en [`CHANGELOG.md`](../CHANGELOG.md).

- **Crear un proyecto:** desde la carpeta raíz de la plantilla, `/crear-proyecto` en Cursor o `node inicializar.mjs` ([00 §2](./00-usar-la-plantilla.md#2-crear-el-proyecto-con-el-inicializador)). El proyecto anota en su `CHANGELOG.md` de qué versión de la plantilla partió.
- **Mejorar la plantilla:** cuando un proyecto descubre algo que sirve a todos (un bug de auth, un componente genérico, una regla nueva), se aplica **primero en la plantilla**, se corre `npm run verify`, se sube `version` en `package.json` (y en la raíz de `package-lock.json`) y se agrega la entrada al `CHANGELOG.md`.
- **Qué versión subir:** **parche** (1.0.1) para correcciones; **menor** (1.1.0) para algo nuevo y compatible; **mayor** (2.0.0) si los proyectos existentes tienen que migrar. En las versiones mayores, describe en el `CHANGELOG.md` qué deben cambiar los proyectos existentes.
- **Actualizar un proyecto existente:** no hay sincronización automática. Revisa el `CHANGELOG.md` entre tu versión de origen y la actual y aplica a mano lo que te sirva (o pídeselo al agente de Cursor dándole el `CHANGELOG.md`).

## Estado de esta documentación

- **Código alineado:** todo lo que describe `docs/` está implementado y verificado con `npm run verify` (lint, typecheck, 23 tests y build) el 22-sep-2026.
