# 07 — Repositorios y contrato de API

> El sistema está partido en dos repos que solo se hablan por HTTP. Este doc resume esa frontera desde el lado del frontend. **El contrato no vive aquí:** vive en el backend, en `soft-black-frontend-backend/docs/contrato/openapi.yaml`.

---

## 1. Dos repositorios

| Repo | Responsabilidad | Stack |
|---|---|---|
| **Frontend** (`soft-black-frontend` o el proyecto creado desde la plantilla) | Pantallas, login, navegación | Next.js 16, React 19, Amplify 6 |
| **Backend** (`soft-black-frontend-backend`) | Datos, lógica de negocio, **autorización de datos** y **el contrato** | Python 3.13, AWS SAM, API Gateway HTTP API, Lambda, Powertools |

```
┌──────────────┐   HTTPS + Authorization: Bearer <accessToken>   ┌──────────────┐
│   Frontend   │ ──────────────────────────────────────────────▶ │   Backend    │
│  (este repo) │ ◀────────────────────────────────────────────── │  (SAM + λ)   │
└──────────────┘      JSON según contrato/openapi.yaml           └──────────────┘
        └────────── mismo User Pool de Cognito (por entorno) ───────────┘
```

**Por qué separados:**

- Cada agente o desarrollador trabaja con el contexto de **un** dominio, sin mezclar lenguajes ni convenciones.
- Despliegue y verificación independientes.
- La frontera es explícita: el `openapi.yaml`.

Dentro del frontend los dashboards **no** se separan en repos: son features del mismo proyecto.

| Elemento | Frontend | Backend |
|---|---|---|
| User Pool de Cognito | Autentica (`NEXT_PUBLIC_*`) | API Gateway valida el token del pool **de su entorno** |
| Grupos | Menú y acceso a rutas (`GROUP_MENU_MAP`, hasta la v1.1) | Autorización de datos: `RESOURCE_GROUPS` en `src/shared/authz.py` (403) |
| Base de datos y otras fuentes | ❌ Sin acceso | ✅ Dueño (DynamoDB, SQL, S3…) |
| Contrato (`openapi.yaml`) | Consume | **Es dueño**, lo implementa y lo verifica con un test |

---

## 2. Dónde está el contrato y reglas generales

**Fuente de verdad:** `soft-black-frontend-backend/docs/contrato/openapi.yaml`. Los detalles (reglas, errores, paginación, cómo escribir un endpoint) están en `soft-black-frontend-backend/docs/04-contrato-api.md`.

- Una **copia de solo lectura** vive en este repo en [`contrato/openapi.yaml`](./contrato/openapi.yaml) para que el agente de Cursor y quien trabaje solo en el frontend la tengan a mano. **No se edita aquí:** se reemplaza entera cuando cambia la del backend.
- El backend tiene un test que falla si el código no coincide con el YAML. Si el YAML dice algo, el backend lo cumple.

Lo esencial para el frontend:

- **Base:** `NEXT_PUBLIC_API_BASE_URL` (sin barra final) = salida `ApiUrl` del stack de SAM de ese entorno.
- **Versionado:** todas las rutas llevan `/v1/...`.
- **Auth:** `Authorization: Bearer <accessToken de Cognito>` (el **access** token, no el id token). Solo `/v1/health` es pública.
- **JSON en `camelCase`**. Fechas ISO 8601 en UTC (`2026-01-31T14:00:00Z`); fechas sin hora `YYYY-MM-DD`. Montos como números.
- **CORS:** el backend solo acepta los orígenes de `AllowedOrigins` de su entorno (en `samconfig.toml`). Si cambia el dominio del frontend, hay que agregarlo allí.
- **Tiempos:** el frontend corta a los 15 s; un endpoint del backend debe responder en ~12 s como máximo.

---

## 3. Errores

### 3.1 Qué devuelve el backend

Los errores que genera la Lambda tienen esta forma:

```json
{
  "error": "Mensaje legible para el usuario, en español",
  "code": "VALIDATION_ERROR"
}
```

| Status | `code` | Cuándo |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Parámetros inválidos (incluye un `cursor` corrupto o `limit` fuera de 1–200) |
| `401` | — | Token ausente, inválido, expirado o de **otro entorno**. Lo responde API Gateway (antes de la Lambda) con `{"message":"Unauthorized"}`, **sin** `error` ni `code` |
| `403` | `FORBIDDEN` | Token válido, pero ningún grupo del usuario tiene permiso sobre el recurso |
| `404` | `NOT_FOUND` | El recurso no existe |
| `409` | `CONFLICT` | Conflicto (por ejemplo, edición concurrente) |
| `500` | `INTERNAL_ERROR` | Error inesperado. **Nunca** trae detalles internos |

### 3.2 Qué hace el frontend

`apiFetch` (en `src/lib/api-client.ts`):

1. Obtiene el token (timeout de 10 s). Sin token → lanza sin enviar.
2. Envía la request con timeout de 15 s.
3. Si `response.ok` → devuelve el JSON como `T` (o `undefined` si es `204`).
4. Si no → lanza **`ApiRequestError`** con `status`, `code` y un `message` en español. Decide por **status**, así que el 401 del authorizer (sin `error`) se maneja igual que cualquier 401.

| Situación | `ApiRequestError.message` | Qué hace `useApiQuery` |
|---|---|---|
| `401` | "Tu sesión expiró. Inicia sesión de nuevo." | Muestra el error. No redirige: el login es opcional |
| `403` | "No tienes permiso para ver esta información." | Muestra el error |
| Otro `4xx`/`5xx` con cuerpo `ApiError` | El `error` del backend | Muestra el error |
| Otro sin cuerpo válido | "Ocurrió un error al consultar los datos (código N)." | Muestra el error |
| Timeout o red | "No se pudo conectar con el servidor. Intenta de nuevo." | Muestra el error |

> Si agregas un caso de error nuevo, cúbrelo en `tests/lib/api-client.test.ts`.

---

## 4. Paginación por cursor

Los listados que pueden crecer se paginan por **cursor**, no por número de página:

```
GET /v1/dashboard_1/indicadores?limit=50
→ 200 { "items": [ … ], "nextCursor": "eyJQSyI6…" }

GET /v1/dashboard_1/indicadores?limit=50&cursor=eyJQSyI6…
→ 200 { "items": [ … ], "nextCursor": null }        ← null = no hay más
```

- `limit`: 1–200, por defecto 50. Fuera de rango → `400`.
- `cursor`: **opaco**. Se copia tal cual del `nextCursor` anterior; nunca se interpreta, se construye ni se guarda en la URL de forma permanente.
- **No hay `total`** salvo que un endpoint lo declare en el contrato (contar filas es caro en DynamoDB y otras fuentes).
- Tipo en el frontend: `CursorPage<T>` (`src/types/api.ts`).

**Por qué cursor y no páginas:** el backend lee de varias fuentes (DynamoDB, SQL, S3, Athena) y todas avanzan con "desde dónde sigo" (`LastEvaluatedKey`, *keyset*, `ContinuationToken`…). Ninguna salta barato a "la página 37". El cursor esconde esa diferencia: el frontend siempre ve lo mismo.

**En la UI:**

- **"Cargar más"** (lo más simple): concatena `items` y guarda el último `nextCursor`; oculta el botón cuando es `null`.
- **"Anterior / Siguiente":** guarda en memoria la pila de cursores visitados (`[undefined, c1, c2…]`) y vuelve al anterior.

```ts
// src/features/<feature>/utils/<feature>-api.ts
export function fetchIndicadores(cursor?: string): Promise<CursorPage<Indicador>> {
  const params = new URLSearchParams({ limit: "50" });
  if (cursor) params.set("cursor", cursor);
  return apiFetch<CursorPage<Indicador>>(`/v1/dashboard_1/indicadores?${params}`);
}
```

---

## 5. Catálogo de endpoints

> El catálogo **es el `openapi.yaml`**. Esta tabla es solo un índice rápido; si difiere del YAML, manda el YAML.

| Método y ruta | Recurso (grupos en el backend) | Para qué | Estado en el frontend |
|---|---|---|---|
| `GET /v1/health` | público | Verificar que la API responde | No se usa |
| `GET /v1/me/permissions` | cualquier usuario autenticado | Usuario, grupos y recursos visibles | Planificado para la v1.1 ([04 §8](./04-autorizacion.md#8-migración-v11-permisos-desde-el-backend)) |
| `GET /v1/dashboard_1/indicadores` | `dashboard_1` | **Ejemplo** del esqueleto del backend: listado paginado | No se usa (la pantalla `dashboard_1` es ilustrativa) |

El endpoint de [02 §5](./02-arquitectura.md#5-agregar-un-dashboard-paso-a-paso) (`GET /v1/reportes/resumen`) es ilustrativo y no existe.

**Cómo pasar de YAML a tipos:** cada esquema del YAML se escribe a mano como `interface` en `src/features/<feature>/types.ts`, con los mismos nombres de campo. Un esquema `XxxPage` con `items` + `nextCursor` se tipa como `CursorPage<Xxx>`, sin redefinirlo.

---

## 6. Cambios al contrato

1. **Se propone** el cambio en `soft-black-frontend-backend/docs/contrato/openapi.yaml` (PR en el repo del backend), en su propio commit y antes del código.
2. Frontend y backend lo acuerdan en el PR.
3. El backend lo implementa (su test de contrato lo obliga a coincidir).
4. El frontend copia el YAML nuevo a [`contrato/openapi.yaml`](./contrato/openapi.yaml), actualiza sus tipos y lo consume.

- **Cambios compatibles** (campo nuevo opcional, endpoint nuevo): se agregan en `/v1`.
- **Cambios incompatibles** (quitar o renombrar un campo, cambiar un tipo): van en `/v2` o se coordina un despliegue conjunto.
- No se documentan endpoints en este repo. Si una pantalla necesita datos que no están en el YAML, se **propone** en el backend.

---

## 7. Entornos: `dev` y `prod` son cuentas distintas

Cada entorno es una **cuenta de AWS distinta** con **su propio User Pool**. Un token de `dev` no sirve contra la API de `prod`, y viceversa.

| Variable del frontend | `dev` | `prod` |
|---|---|---|
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | User Pool de dev | User Pool de prod |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | App Client de dev | App Client de prod |
| `NEXT_PUBLIC_API_BASE_URL` | `ApiUrl` del stack `dev` | `ApiUrl` del stack `prod` |

Las tres cambian **juntas**. Además, en el backend (`samconfig.toml` de cada entorno):

- El App Client del frontend debe estar en `CognitoClientIds`.
- El origen del frontend debe estar en `AllowedOrigins`.
- Los **grupos** se llaman igual en los dos pools.

Detalle en [06 §3](./06-entorno-y-deploy.md#3-variables-de-entorno).

---

## 8. Reglas para quien trabaja en el frontend (personas o agentes)

- Trabaja **solo** en este repo. No asumas cómo está implementado el backend.
- Todo dato viene de un endpoint del `openapi.yaml`. Si no existe, se **propone** en el backend; no se inventa una forma de respuesta.
- Toda llamada pasa por `apiFetch`, dentro de `src/features/<feature>/utils/<feature>-api.ts`.
- Nunca edites `docs/contrato/openapi.yaml` a mano: es una copia.
