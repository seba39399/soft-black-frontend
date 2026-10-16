# 01 — Visión y stack

> Qué es la plantilla, con qué está hecha y qué deja fuera a propósito.

---

## 1. Qué es

`soft-black-frontend` es una **plantilla** para construir dashboards web internos de consulta y gestión de datos. No es un producto terminado: es la base común para que cada dashboard nuevo empiece con lo transversal ya resuelto.

**Lo que ya trae:**

- **Login opcional contra AWS Cognito**, con cambio de la contraseña temporal en el primer inicio de sesión. No hay registro público: los usuarios se crean en la consola de AWS. La app se recorre **sin** iniciar sesión.
- **Shell**: menú superior flotante, a todo el ancho. Sin sesión muestra "Iniciar sesión"; con sesión, el usuario y el logout.
- **Menú**: el catálogo completo de `NAV_ITEMS`. Los grupos de Cognito ya no cierran rutas.
- **`src/proxy.ts`**: deja pasar las rutas. No redirige a `/login`.
- **Cliente HTTP** (`apiFetch`) que, si hay sesión, adjunta el token y normaliza los errores del backend. Sin sesión, la llamada de datos falla con un mensaje y la pantalla sigue abierta.
- **Pantalla de ejemplo** `dashboard_1`, visible sin login.

**Lo que cada proyecto agrega:** sus pantallas (`src/features/<nombre>/`), sus grupos y los endpoints que consume.

---

## 2. Stack

| Capa | Tecnología | Versión | Notas |
|---|---|---|---|
| Runtime | **Node.js** | `22.15.1` | Fijado en `.nvmrc` y `package.json → engines`. Ver [06 §2](./06-entorno-y-deploy.md#2-nodejs-2215-con-nvm) |
| Framework | **Next.js** | `16.2.6` | App Router, Route Groups, `proxy.ts`. **Breaking changes** frente a Next ≤15 |
| UI | **React / React DOM** | `19.2.4` | Server y Client Components |
| Lenguaje | **TypeScript** | `^5` | `strict: true` |
| Auth (cliente) | **aws-amplify** | `6.22.0` | Solo el subpath `aws-amplify/auth` |
| Auth (servidor) | **@aws-amplify/adapter-nextjs** | `1.8.0` | `createServerRunner`, usado en `proxy.ts`. **Su numeración es 1.x**, no sigue la de `aws-amplify` |
| Estilos Amplify | **@aws-amplify/ui-react** | `6.15.6` | **Solo** su CSS; no se usan sus componentes |
| Estilos | **Tailwind CSS** | `v4` | Vía `@tailwindcss/postcss` |
| Iconos | **lucide-react** | `1.16.0` | Un import por icono |
| Tests | **Vitest** + **Testing Library** + **fast-check** | `2.1.8` / `16.1.0` / `3.23.2` | Ver [05 §9](./05-convenciones-y-testing.md#9-testing) |
| Paquetes | **npm** | el que trae Node 22.15 | `package-lock.json` versionado |

### Reglas sobre dependencias

- Las dependencias de **runtime** van con versión **exacta** (sin `^` ni `~`). Las de desarrollo pueden llevar rango.
- Los paquetes `aws-amplify`, `@aws-amplify/adapter-nextjs` y `@aws-amplify/ui-react` se actualizan **juntos**, y se verifica con `npm ls @aws-amplify/core` que quede **una sola** versión de `@aws-amplify/core`. Con dos versiones, `proxy.ts` deja de compilar por incompatibilidad de tipos.
- Antes de agregar una dependencia, pregúntate si la plataforma ya lo resuelve (`fetch`, `Intl`, `URLSearchParams`…). Si la agregas, justifícalo en el PR.
- **No** agregar librerías de estado global ni UI kits pesados sin acuerdo del equipo.
- **Nunca** credenciales de AWS ni el AWS SDK con claves en el frontend.

> **Si vas a sumar gráficos o tablas**, acuerda una sola librería para toda la plantilla y documéntala aquí para que cada dashboard no traiga una distinta.

---

## 3. Principios de diseño

1. **Feature-Driven + colocation.** El código se agrupa por dominio (`src/features/`), no por tipo de archivo.
2. **`src/app/` solo enruta.** Los `page.tsx` delegan en un componente del feature.
3. **Seguro por defecto.** Toda ruta nueva queda protegida por `proxy.ts` sin configuración extra, y un usuario sin grupo no ve nada.
4. **Autorización declarativa.** Quién ve qué vive en `nav-config.ts`, no repartido por los componentes.
5. **Lógica pura aparte.** Cálculo, filtrado y formateo van en `utils/` (`.ts` sin JSX), para poder testearlos.
6. **Bundle liviano.** Imports por subpath y `optimizePackageImports` en `next.config.ts`.

---

## 4. Fuera de alcance

Son decisiones tomadas; incorporarlas requiere acuerdo del equipo:

- Registro público de usuarios y "olvidé mi contraseña" (se puede agregar con `resetPassword` de Amplify; ver [03 §4](./03-autenticacion.md#4-cambio-de-contraseña-temporal)).
- MFA.
- Persistencia de datos de negocio en el front: la fuente es siempre la API.
- Multi-idioma: la UI es en español (`<html lang="es">`).
- Route Handlers propios (`src/app/api/`): los datos vienen de la API externa (ver [07](./07-repos-y-contrato-api.md)).
