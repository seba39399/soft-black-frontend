# 02 — Arquitectura

> Dónde vive cada cosa y cómo se agrega una pantalla. Esta organización es **obligatoria**.

---

## 1. Principio: Feature-Driven

El código se organiza por **dominio funcional** (feature). Cada feature agrupa su UI, su lógica y sus tipos. `src/app/` solo sirve para **enrutar**.

```
¿Dónde pongo esto?
│
├─ ¿Es una URL?                              → src/app/(auth|dashboard)/<ruta>/page.tsx
├─ ¿Es UI de un dominio concreto?            → src/features/<dominio>/components/
├─ ¿Es lógica sin JSX de un dominio?         → src/features/<dominio>/utils/
├─ ¿Son tipos de las respuestas de un dominio? → src/features/<dominio>/types.ts
├─ ¿Es UI genérica usada por 2+ features?    → src/components/ui/
├─ ¿Es infraestructura transversal sin JSX?  → src/lib/
└─ ¿Son tipos transversales del contrato?    → src/types/
```

---

## 2. Estructura

```
src/
├── app/                                  # SOLO enrutamiento + estilos globales
│   ├── layout.tsx                        # Root: CSS global + CSS Amplify, <ConfigureAmplify>, lang="es"
│   ├── globals.css                       # Tailwind v4
│   ├── (auth)/                           # Grupo público (no aparece en la URL)
│   │   └── login/page.tsx                # /login → <LoginPage/>
│   └── (dashboard)/                      # Grupo privado
│   ├── not-found.tsx                     # 404 global
│       ├── layout.tsx                    # <MainDashboardLayout/> (shell + guard cliente)
│       ├── error.tsx                     # Error boundary de las pantallas privadas → <ErrorState/>
│       ├── page.tsx                      # /  → redirige a la primera ruta de NAV_ITEMS
│       └── dashboard_1/page.tsx          # /dashboard_1 → <Dashboard1Page/>
│
├── features/
│   ├── auth/                             # Login, sesión, grupos, errores de Cognito
│   │   ├── components/
│   │   │   ├── ConfigureAmplify.tsx      # ÚNICO Amplify.configure del proyecto
│   │   │   └── LoginPage.tsx             # Fases credentials / newPassword
│   │   └── utils/
│   │       ├── env.ts                    # Lectura y validación de NEXT_PUBLIC_*
│   │       ├── cognito-groups.ts         # getUserGroups()
│   │       ├── cognito-errors.ts         # translateCognitoError(error, phase)
│   │       └── amplify-server.ts         # runWithAmplifyServerContext
│   │
│   ├── main-dashboard/                   # Shell común (sin datos de negocio)
│   │   ├── components/
│   │   │   ├── MainDashboardLayout.tsx   # Guard cliente, menú, logout
│   │   │   ├── TopNav.tsx                # Menú superior en píldora
│   │   │   └── AppHeader.tsx
│   │   └── utils/
│   │       └── nav-config.ts             # NAV_ITEMS, GROUP_MENU_MAP y helpers de acceso
│   │
│   └── dashboard_1/                      # Ejemplo: mismo nombre que la ruta
│       ├── components/Dashboard1Page.tsx # "Hola mundo" + usuario, grupos y dashboards
│       └── utils/use-session-summary.ts
│
├── components/ui/                        # Genéricos: Spinner, ErrorState, EmptyState
├── lib/
│   ├── app-config.ts                     # Nombre de la app (único lugar)
│   ├── api-client.ts                     # apiFetch<T>, ApiRequestError
│   ├── use-api-query.ts                  # Hook de carga de datos (loading / error / data)
│   └── with-timeout.ts                   # Timeout para promesas
├── types/api.ts                          # ApiError, CursorPage<T>
└── proxy.ts                              # Guard de servidor (ver doc 03 §7)

tests/                                    # Tests (Vitest) — ver doc 05 §9
```

---

## 3. Reglas

### 3.1 `src/app/`

- **Route Groups:** `(auth)` es público y `(dashboard)` es privado. Los paréntesis no aparecen en la URL.
- Un `page.tsx` **solo** importa y renderiza el componente principal del feature (o redirige). Como referencia, no debería pasar de unas 15 líneas.
- **Prohibido** en `src/app/`: lógica de negocio, llamadas a la API, helpers y maquetación extensa.
- Toda pantalla privada es una subcarpeta **directa** de `(dashboard)/`.

### 3.2 `src/features/<nombre>/`

| Carpeta / archivo | Contiene | No contiene |
|---|---|---|
| `components/` | `.tsx`, un componente por archivo | Cálculos, `fetch`, formateo |
| `utils/` | `.ts` sin JSX: llamadas a la API del dominio, cálculos, formateo y hooks del dominio | JSX |
| `types.ts` | Tipos de las respuestas de **este** dominio | Tipos de otros dominios |

- Un feature **no importa** de otro feature de negocio. Si dos lo necesitan, súbelo a `src/components/ui/` o `src/lib/`.
- `auth` y `main-dashboard` son features de infraestructura: los de negocio pueden importar de ellos.

### 3.3 Correspondencia 1:1 ruta ↔ feature

| Ruta | Feature | URL |
|---|---|---|
| `src/app/(dashboard)/dashboard_1/page.tsx` | `src/features/dashboard_1/` | `/dashboard_1` |
| `src/app/(dashboard)/reportes/page.tsx` | `src/features/reportes/` | `/reportes` |

**Mismo nombre, siempre.** Usa `kebab-case` o `snake_case`, pero el mismo en ambos lados y en la clave de `NAV_ITEMS`.

### 3.4 `src/components/ui/`, `src/lib/` y `src/types/`

- `components/ui/`: UI genérica **ya usada** por dos o más features. No se crea "por si acaso".
- `components/ui/` trae de fábrica `Spinner`, `ErrorState` (mensaje + reintentar) y `EmptyState` (sin datos): úsalos para los estados de cada pantalla.
- `lib/`: infraestructura sin JSX (`api-client.ts`, `with-timeout.ts`), configuración (`app-config.ts`) y hooks transversales (`use-api-query.ts`).
- `types/`: solo tipos **transversales** del contrato (`ApiError`, `CursorPage<T>`). Los tipos de cada dominio van en su `types.ts`.

---

## 4. Antipatrones

- Un componente que mezcla render, cálculo y llamada a la API.
- Lógica o `fetch` dentro de `page.tsx`.
- `fetch(...)` directo en vez de `apiFetch`.
- Verificar la sesión en cada página: el layout ya resuelve invitado o usuario.
- Listas de menú escritas a mano en `TopNav`/`AppHeader` en vez de recibir `navItems` por props.
- Un feature de negocio que importa de otro feature de negocio.

---

## 5. Agregar un dashboard (paso a paso)

> **Esta es la única copia de este procedimiento.** El README raíz y la skill `/nuevo-dashboard` enlazan aquí.

Ejemplo: un dashboard **`reportes`** que muestra un resumen de ventas pedido a la API.

### Paso 1 — Acordar el endpoint

Si la pantalla necesita datos nuevos, primero se propone el endpoint en el `openapi.yaml` del backend ([07 §6](./07-repos-y-contrato-api.md#6-cambios-al-contrato)). Aquí suponemos:

```
GET /v1/reportes/resumen?desde=2026-01-01&hasta=2026-01-31
→ 200 { "items": [{ "region": "Norte", "total": 1250000 }], "generadoEn": "2026-02-01T10:00:00Z" }
```

### Paso 2 — Crear el feature

```
src/features/reportes/
├── types.ts
├── utils/
│   ├── reportes-api.ts
│   └── format.ts
└── components/
    ├── ReportesPage.tsx
    └── ResumenTabla.tsx
```

**`types.ts`** — refleja exactamente el contrato:

```ts
export interface ResumenRegion {
  region: string;
  total: number;
}

export interface ResumenVentas {
  items: ResumenRegion[];
  generadoEn: string; // ISO 8601 UTC
}
```

**`utils/reportes-api.ts`** — la única puerta del feature hacia la API:

```ts
import { apiFetch } from "@/lib/api-client";
import type { ResumenVentas } from "@/features/reportes/types";

export function fetchResumenVentas(desde: string, hasta: string): Promise<ResumenVentas> {
  const qs = new URLSearchParams({ desde, hasta });
  return apiFetch<ResumenVentas>(`/v1/reportes/resumen?${qs.toString()}`);
}
```

**`utils/format.ts`** — lógica pura y testeable:

```ts
const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCOP(value: number): string {
  return COP.format(value);
}
```

**`components/ReportesPage.tsx`** — maneja los cuatro estados: cargando, error, vacío y con datos. `useApiQuery(fetcher, deps)` repite la consulta cuando cambian los `deps`, que deben ser valores simples (strings, números, booleanos), por ejemplo los filtros de fecha:

```tsx
"use client";

import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Spinner from "@/components/ui/Spinner";
import { useApiQuery } from "@/lib/use-api-query";
import { fetchResumenVentas } from "@/features/reportes/utils/reportes-api";
import ResumenTabla from "@/features/reportes/components/ResumenTabla";

export default function ReportesPage(): React.ReactElement {
  const { data, error, loading, reload } = useApiQuery(
    () => fetchResumenVentas("2026-01-01", "2026-01-31"),
    [],
  );

  if (loading) return <Spinner label="Cargando reporte" />;

  if (error) return <ErrorState message={error} onRetry={reload} />;

  if (!data || data.items.length === 0) {
    return <EmptyState message="No hay datos para el periodo seleccionado." />;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Resumen de ventas</h2>
      <ResumenTabla items={data.items} />
    </section>
  );
}
```

**`components/ResumenTabla.tsx`**:

```tsx
import type { ResumenRegion } from "@/features/reportes/types";
import { formatCOP } from "@/features/reportes/utils/format";

interface ResumenTablaProps {
  items: ResumenRegion[];
}

export default function ResumenTabla({ items }: ResumenTablaProps): React.ReactElement {
  return (
    <table className="w-full text-left">
      <thead>
        <tr>
          <th scope="col">Región</th>
          <th scope="col" className="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.region}>
            <td>{item.region}</td>
            <td className="text-right tabular-nums">{formatCOP(item.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Paso 3 — Crear la ruta

`src/app/(dashboard)/reportes/page.tsx`:

```tsx
import ReportesPage from "@/features/reportes/components/ReportesPage";

export default function Page(): React.ReactElement {
  return <ReportesPage />;
}
```

### Paso 4 — Registrar en `nav-config.ts`

```ts
export const NAV_ITEMS = {
  dashboard_1: { href: "/dashboard_1", label: "Dashboard 1" },
  reportes:    { href: "/reportes",    label: "Reportes" },   // ← nuevo
} as const satisfies Record<string, NavItem>;

export const GROUP_MENU_MAP: Record<string, readonly NavItemKey[]> = {
  admin:  ["dashboard_1", "reportes"],                         // ← agregado
  ventas: ["reportes"],                                        // ← grupo nuevo (debe existir en Cognito)
};
```

**No hay que tocar `proxy.ts`.** Deja pasar las rutas: el login es opcional (ver [03 §7](./03-autenticacion.md#7-guard-de-servidor--srcproxyts)). El menú sale de `NAV_ITEMS`.

### Paso 5 — Tests y verificación

- Test de `format.ts` (y de cualquier otra lógica en `utils/`), ver [05 §9](./05-convenciones-y-testing.md#9-testing).
- Si agregaste grupos, extiende el test de `nav-config`.
- `npm run verify` (lint + typecheck + tests + build).
- Prueba manual: un usuario del grupo ve el item y entra; uno de otro grupo **no** lo ve y, si escribe `/reportes` en la URL, es redirigido.

### Checklist

- [ ] Endpoint documentado en el contrato (doc 07).
- [ ] `src/features/<nombre>/` con `components/`, `utils/` y `types.ts`.
- [ ] `src/app/(dashboard)/<nombre>/page.tsx` que solo renderiza.
- [ ] Entrada en `NAV_ITEMS` y en `GROUP_MENU_MAP`.
- [ ] Grupos creados en Cognito con el nombre exacto.
- [ ] Estados de carga, error y vacío.
- [ ] Tests de `utils/`.
- [ ] `npm run verify` sin errores.
