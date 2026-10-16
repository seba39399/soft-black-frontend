# 05 — Convenciones y testing

> Reglas para todo el código nuevo. Si algo no está aquí, sigue lo que ya hace el código existente y, si es una decisión nueva, agrégala a este doc en el mismo PR.

---

## 1. TypeScript

- `strict: true`. Prohibido `any` (implícito o explícito). Si de verdad no conoces el tipo, usa `unknown` y estréchalo.
- Tipa explícitamente las props (`interface XProps`) y las respuestas de la API.
- Imports con el alias `@/` (`@/features/auth/utils/env`), no rutas relativas largas (`../../../`).
- Tipos de respuestas de un dominio → `src/features/<dominio>/types.ts`. Tipos transversales del contrato → `src/types/api.ts`.
- Prefiere `as const satisfies …` para catálogos (ver `NAV_ITEMS`): conserva los literales y valida la forma.

---

## 2. Next.js 16

- **Ante la duda, lee `node_modules/next/dist/docs/`**, que corresponde a la versión instalada. Muchos ejemplos de internet son de Next 13–15 y no aplican.
- `middleware.ts` → `proxy.ts`, que corre en Node por defecto y **no** admite `export const runtime` (ver [03 §7](./03-autenticacion.md#7-guard-de-servidor--srcproxyts)).
- `"use client"` solo donde hace falta: estado, efectos, eventos o APIs del navegador. Hoy: `ConfigureAmplify`, `LoginPage`, `MainDashboardLayout`, `TopNav`, `AppHeader` y los componentes de pantalla que cargan datos.
- Los `page.tsx` son ligeros (ver [02 §3.1](./02-arquitectura.md#31-srcapp)).

---

## 3. Rendimiento

- **Sin cascadas de `await`:** si dos pedidos no dependen entre sí, usa `Promise.all`.
- **Valida antes de esperar:** las comprobaciones síncronas (campos vacíos, parámetros inválidos) van **antes** del `await`.
- **Imports por subpath:** `aws-amplify/auth` (cliente), `aws-amplify/auth/server` (servidor) y un import por icono de `lucide-react`.
- `optimizePackageImports` está configurado en `next.config.ts` para `aws-amplify`, `@aws-amplify/ui-react` y `lucide-react`. Si agregas una librería con barrel exports grande, súmala ahí.
- `@aws-amplify/ui-react` se usa **solo** por su CSS.
- **Sin estado global mutable en el servidor** (el proxy y el SSR atienden requests de distintos usuarios).

---

## 4. Componentes

- **Un componente por archivo**, con export default. El nombre del archivo es el del componente (`ResumenTabla.tsx`).
- Si un componente pasa de unas 150 líneas o hace más de una cosa, divídelo.
- La lógica (cálculo, filtrado, formateo) va en `utils/`, no dentro del componente.
- **Cuatro estados** en toda pantalla con datos: cargando (`Spinner`), error (`ErrorState`, con reintentar), vacío (`EmptyState`) y con datos. Los tres componentes están en `src/components/ui/`.
- **Títulos:** el `<h1>` de cada pantalla lo pone el header (es el `label` de `NAV_ITEMS`). Dentro de la pantalla, empieza en `<h2>`.

### Accesibilidad mínima

- Cada `input` tiene un `<label>` asociado.
- Los botones que solo tienen icono llevan `aria-label`.
- Estados de carga: `role="status"`. Errores: `role="alert"`.
- Navegación: `aria-label` en el `<nav>` y `aria-current="page"` en el item activo.
- Tablas: `<th scope="col">`.

---

## 5. Estilos

- Tailwind CSS v4 (`src/app/globals.css`). Usa utilidades en vez de CSS a mano.
- Evita `style={{…}}`, salvo valores realmente dinámicos (por ejemplo el ancho de una barra calculado).
- Números en tablas: `tabular-nums` y alineados a la derecha.
- UI en **español**. Fechas y montos con `Intl` y locale `es-CO`.

---

## 6. Manejo de errores

- **Cognito** → `translateCognitoError(error, phase)`. Nunca muestres el mensaje original de AWS.
- **API** → `apiFetch` lanza `ApiRequestError` con `status` y un mensaje en español. La UI muestra `error.message` (ver [07 §3](./07-repos-y-contrato-api.md#3-errores)).
- No tragues errores: todo `catch` termina en un estado visible (mensaje) o seguro (redirección).
- Nada de `console.log` en el código que se commitea. `console.error` solo en `catch` que de verdad necesiten diagnóstico.

---

## 7. Seguridad

- Solo las tres variables `NEXT_PUBLIC_*` acordadas. **Nunca** secretos en el front: todo `NEXT_PUBLIC_*` termina visible en el navegador.
- App Client de Cognito **público** (sin secret).
- Ocultar algo en la UI no es autorización de datos. Las rutas están abiertas. La API sigue validando el token en cada llamada.
- No renderices HTML que venga de la API (`dangerouslySetInnerHTML`) sin sanitizarlo.

---

## 8. Nomenclatura

| Qué | Convención | Ejemplo |
|---|---|---|
| Componentes | `PascalCase.tsx` | `ResumenTabla.tsx` |
| Utils, hooks, libs | `kebab-case.ts` | `reportes-api.ts`, `use-api-query.ts` |
| Hooks | Prefijo `use` | `useApiQuery` |
| Tipos de dominio | `types.ts` en la raíz del feature | `src/features/reportes/types.ts` |
| Tests | Mismo nombre + `.test.ts(x)` bajo `tests/` | `tests/features/reportes/format.test.ts` |
| Ruta, feature y clave de `NAV_ITEMS` | Idénticos entre sí | `reportes` |
| Grupos | Idénticos a Cognito | `admin`, `ventas` |

---

## 9. Testing

### 9.1 Herramientas (ya configuradas)

- **Vitest** (`vitest.config.mts`) con entorno `jsdom` y el alias `@/`.
- **Testing Library** (`@testing-library/react`, `jest-dom`, `user-event`) para componentes.
- **fast-check** para tests de propiedades (mínimo 100 corridas, configurado en `tests/setup.ts`).

```bash
npm test            # una pasada (CI)
npm run test:watch  # modo watch mientras desarrollas
```

Tests incluidos: `nav-config` (propiedades), `cognito-errors`, `api-client` y los componentes `LoginPage` y `MainDashboardLayout` con Amplify simulado (`vi.mock("aws-amplify/auth")`). Úsalos como modelo.

### 9.2 Dónde van

Vitest busca `tests/**/*.test.{ts,tsx}`. Replica la estructura de `src/`:

```
tests/
├── setup.ts
├── features/
│   ├── auth/
│   │   ├── cognito-errors.test.ts
│   │   └── LoginPage.test.tsx
│   ├── main-dashboard/
│   │   ├── nav-config.test.ts
│   │   └── MainDashboardLayout.test.tsx
│   └── reportes/format.test.ts          # (del ejemplo de 02 §5)
└── lib/api-client.test.ts
```

### 9.3 Qué se testea

| Tipo de código | Test | Obligatorio |
|---|---|---|
| `utils/` puros (cálculo, formateo, `nav-config`, `cognito-errors`, `env`) | Unitario y, si hay invariantes, de propiedades | **Sí** |
| `lib/api-client.ts` | Unitario con `fetch` y `fetchAuthSession` mockeados | **Sí** |
| Componentes de pantalla | Testing Library: los cuatro estados | Recomendado |
| `proxy.ts`, `amplify-server.ts` | Solo integración o prueba manual | No |

### 9.4 Ejemplo: test unitario

```ts
// tests/features/reportes/format.test.ts
import { describe, expect, it } from "vitest";
import { formatCOP } from "@/features/reportes/utils/format";

describe("formatCOP", () => {
  it("formatea sin decimales", () => {
    expect(formatCOP(1250000)).toMatch(/1\.250\.000/);
  });
});
```

### 9.5 Ejemplo: test de propiedades

Un test de propiedades comprueba una regla para **cualquier** entrada, no para un ejemplo fijo:

```ts
// tests/features/main-dashboard/nav-config.test.ts
import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import {
  GROUP_MENU_MAP,
  canAccessRoute,
  resolveNavItems,
  resolveRedirectTarget,
} from "@/features/main-dashboard/utils/nav-config";

const knownGroup = fc.constantFrom(...Object.keys(GROUP_MENU_MAP));
const anyGroups = fc.array(fc.oneof(knownGroup, fc.string()));

describe("nav-config", () => {
  it("el orden de los grupos no cambia el menú", () => {
    fc.assert(
      fc.property(anyGroups, (groups) => {
        const reversed = [...groups].reverse();
        expect(resolveNavItems(reversed)).toEqual(resolveNavItems(groups));
      }),
    );
  });

  it("toda ruta del menú es accesible", () => {
    fc.assert(
      fc.property(anyGroups, (groups) => {
        for (const item of resolveNavItems(groups)) {
          expect(canAccessRoute(groups, item.href)).toBe(true);
        }
      }),
    );
  });

  it("el destino de redirección es accesible o es /login", () => {
    fc.assert(
      fc.property(anyGroups, (groups) => {
        const target = resolveRedirectTarget(groups);
        expect(target === "/login" || canAccessRoute(groups, target)).toBe(true);
      }),
    );
  });

  it("/radio no da acceso a /radio_10", () => {
    expect(canAccessRoute(["admin"], "/radio")).toBe(true);
    expect(canAccessRoute(["admin"], "/radio_10")).toBe(false);
  });
});
```

Nombra cada test de propiedad describiendo la regla en español ("el orden de los grupos no cambia el menú").

> **Por qué vale la pena:** fast-check genera nombres de grupo como `"constructor"` o `"toString"`, que en un `GROUP_MENU_MAP[group]` ingenuo devolverían métodos de `Object.prototype`, y `resolveNavItems` lanzaría `TypeError: not iterable`. Un usuario en un grupo de Cognito con ese nombre rompería el proxy. Por eso `nav-config.ts` usa `Object.hasOwn`, y estos tests lo protegen.

---

## 10. Definición de terminado

Una tarea está terminada cuando:

- [ ] `npm run verify` pasa: ejecuta `lint`, `typecheck`, `test` y `build` en ese orden y se detiene en el primer error.
- [ ] Se probó manualmente el flujo afectado (al menos con un usuario con acceso y uno sin acceso).
- [ ] Si cambió un comportamiento documentado, el doc correspondiente se actualizó en el mismo PR.

No se agregan formateadores ni linters nuevos sin acuerdo del equipo.
