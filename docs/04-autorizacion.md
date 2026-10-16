# 04 — Menú

> El login es opcional. **Todas** las entradas de `NAV_ITEMS` se ven y se pueden abrir, con o sin sesión. `GROUP_MENU_MAP` sigue en el archivo (y los tests de `resolveNavItems` siguen válidos), pero el shell **no** lo usa para ocultar pantallas.

---

## 1. Idea central

```
NAV_ITEMS  →  menú completo y rutas abiertas
GROUP_MENU_MAP  →  queda declarado, no cierra el acceso
```

Quien no tiene sesión entra igual. La cabecera ofrece `/login`.

---

## 2. De dónde salen los grupos — `cognito-groups.ts`

`getUserGroups()` lee el claim `cognito:groups` del **access token**:

- Si es un array → devuelve solo sus elementos `string`.
- En cualquier otro caso (sin sesión, sin claim, `null`, otro tipo) → `[]`.

Se usa el access token para ser coherente con `proxy.ts` y con el Bearer que se envía a la API.

---

## 3. `nav-config.ts`

| Export | Qué es |
|---|---|
| `NavItem` | `{ href: string; label: string }`. `label` en español |
| `NAV_ITEMS` | Catálogo de rutas privadas. **El orden de declaración es el orden del menú** y define cuál es la "primera ruta" |
| `NavItemKey` | Claves válidas de `NAV_ITEMS` (tipado: un typo en `GROUP_MENU_MAP` no compila) |
| `GROUP_MENU_MAP` | Grupo de Cognito → claves permitidas. **Las claves deben coincidir exactamente con los grupos de Cognito** |
| `DEFAULT_NAV_ITEMS` | Lo que ve un usuario sin grupos mapeados. Por defecto `[]`: nada |
| `resolveNavItems(groups)` | Unión sin duplicados de los items de todos sus grupos, en el orden de `NAV_ITEMS` |
| `canAccessRoute(groups, path)` | `true` si `path` es igual a un `href` permitido o está debajo de él (`/reportes/detalle`) |
| `resolveRedirectTarget(groups)` | Primera ruta permitida, o `"/login"` si no tiene ninguna |

Todas las funciones son **puras**: las usan el cliente y el servidor, y son fáciles de testear.

```ts
export function canAccessRoute(groups: readonly string[], href: string): boolean {
  return resolveNavItems(groups).some(
    (item) => href === item.href || href.startsWith(item.href + "/"),
  );
}
```

El `+ "/"` evita que `/radio` dé acceso a `/radio_10`.

---

## 4. Dónde se aplica

| Capa | Archivo | Qué hace |
|---|---|---|
| Cliente | `MainDashboardLayout.tsx` | Muestra `catalogNavItems()` con o sin sesión |
| Servidor | `src/proxy.ts` | Deja pasar la request |
| Login | `LoginPage.tsx` | Opcional. Tras entrar, va a la primera ruta del catálogo |
| API | Backend | Sin token, la llamada de datos falla; la pantalla sigue abierta |

---

## 5. Casos

| Usuario | Menú | Cualquier ruta de `NAV_ITEMS` |
|---|---|---|
| Sin sesión | Catálogo completo | Entra |
| Con sesión, cualquier grupo | Catálogo completo | Entra |

---

## 6. Operaciones frecuentes

**Dar acceso a un grupo a un dashboard existente:**

```ts
GROUP_MENU_MAP = {
  ventas: ["reportes", "dashboard_1"],   // ← se agrega la clave
};
```

**Crear un grupo nuevo:** crearlo con el nombre exacto en el User Pool de **cada** entorno (`dev` y `prod` son pools distintos) → agregarlo a `GROUP_MENU_MAP` → pedir al backend que lo agregue en `RESOURCE_GROUPS` para los mismos recursos → asignar usuarios en la consola.

**Agregar un dashboard:** ver [02 §5](./02-arquitectura.md#5-agregar-un-dashboard-paso-a-paso).

> **Ojo con la caché del token:** los grupos viajan dentro del token. Si cambias los grupos de un usuario en Cognito, el cambio se aplica cuando el token se renueva (hasta 1 h por defecto) o cuando el usuario vuelve a iniciar sesión.

---

## 7. Reglas

- `NAV_ITEMS` es la fuente del menú visible. El shell usa `catalogNavItems()`, no `resolveNavItems`.
- `GROUP_MENU_MAP` permanece en el archivo. Ya no decide quién entra a una ruta.
- `DEFAULT_NAV_ITEMS` sigue en `[]`. No afecta al shell abierto.
- El backend valida el token en los datos (`RESOURCE_GROUPS` en `src/shared/authz.py`). La pantalla se abre igual; un dato no autorizado llega como error de la API.
- `GROUP_MENU_MAP` ya no tiene que coincidir con el menú. Si el backend no autoriza el recurso, la pantalla muestra el error de la llamada.

---

## 8. Migración v1.1: permisos desde el backend

> **Estado: planificada.** El código actual (v1.0) sigue usando `GROUP_MENU_MAP`. Se migra cuando el backend esté desplegado en el entorno, porque a partir de ese momento el login depende de la API.

Hoy el mapa grupo → dashboards existe **dos veces**: `GROUP_MENU_MAP` aquí y `RESOURCE_GROUPS` en el backend. En la v1.1 el frontend deja de decidirlo y lo pregunta:

```http
GET /v1/me/permissions
→ 200 { "user": "usuario.prueba", "groups": ["admin"], "resources": ["dashboard_1"] }
```

**Regla de nombres:** clave de `NAV_ITEMS` = recurso del backend = feature = ruta (`reportes` ↔ `/reportes` ↔ `RESOURCE_GROUPS["reportes"]`).

| Pieza | v1.0 (hoy) | v1.1 |
|---|---|---|
| `NAV_ITEMS` | Frontend | Frontend (sin cambios: href y label) |
| `GROUP_MENU_MAP` | Frontend | **Se elimina.** Lo reemplaza `resources` de `/v1/me/permissions` |
| `DEFAULT_NAV_ITEMS` | `[]` | Se elimina (sin recursos = sin menú) |
| `getUserGroups()` en layout y login | Sí | Se reemplaza por `fetchMyPermissions()` (una vez por sesión, en un contexto de React) |
| `src/proxy.ts` | Deja pasar. No verifica sesión ni grupo | Plan histórico: solo la sesión. Hoy no corta rutas |

**Cambios en el código:**

1. `src/features/auth/utils/permissions-api.ts`: `fetchMyPermissions()` con `apiFetch`, tipado desde el esquema `MyPermissions` del contrato.
2. `nav-config.ts`: `resolveNavItems(resources)`, `canAccessRoute(resources, href)` y `resolveRedirectTarget(resources)` reciben recursos en vez de grupos.
3. `MainDashboardLayout` y `LoginPage` usan los permisos. Si `resources` está vacío, el login muestra "Tu usuario no tiene dashboards asignados" como hoy.
4. Si `/v1/me/permissions` falla (red, 5xx), el layout muestra `ErrorState` con "Reintentar". **No** asume permisos.
5. Los tests de propiedades de `nav-config` generan `resources` en lugar de grupos.
6. Docs 03 y 04 actualizados; `CHANGELOG.md` → 1.1.0.

**Ventaja:** un solo lugar para los permisos (el backend) y ninguna posibilidad de que el menú y la API discrepen.
