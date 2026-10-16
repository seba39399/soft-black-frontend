/**
 * Fuente única de navegación y autorización.
 *
 * `nav-config.ts` gobierna a la vez el menú visible y el acceso a rutas.
 * Todas las funciones son puras y reutilizables por cliente (grupos del
 * usuario) y servidor (unión de grupos de la sesión).
 */

export interface NavItem {
  /** Ruta bajo (dashboard)/, p. ej. "/dashboard_1". */
  href: string;
  /** Etiqueta visible en español. */
  label: string;
}

/**
 * Catálogo de rutas privadas. El orden de declaración define el orden estable
 * usado por `resolveNavItems` y por el cálculo del destino de redirección.
 */
export const NAV_ITEMS = {
  inicio: { href: "/inicio", label: "INICIO" },
  artistas: { href: "/artistas", label: "ARTISTAS" },
  radio: { href: "/radio", label: "RADIO" },
  eventos: { href: "/eventos", label: "EVENTOS" },
  contacto: { href: "/contacto", label: "CONTACTO" },
} as const satisfies Record<string, NavItem>;

export type NavItemKey = keyof typeof NAV_ITEMS;

/**
 * Mapa grupo de Cognito → claves de navegación permitidas.
 * El grupo `admin` es un ejemplo con el catálogo completo.
 */
export const GROUP_MENU_MAP: Record<string, readonly NavItemKey[]> = {
  admin: ["inicio", "artistas", "radio", "eventos", "contacto"],
};

/**
 * Items por defecto cuando la lista de grupos es vacía o solo contiene grupos
 * desconocidos. `[]` es la opción más restrictiva (sin acceso).
 */
export const DEFAULT_NAV_ITEMS: readonly NavItemKey[] = [];

/** Orden de declaración de las claves de `NAV_ITEMS`. */
const NAV_ITEM_ORDER = Object.keys(NAV_ITEMS) as NavItemKey[];

/**
 * Catálogo completo, en el orden de `NAV_ITEMS`.
 * El shell lo usa porque el login es opcional: sin sesión se ve todo.
 */
export function catalogNavItems(): NavItem[] {
  return NAV_ITEM_ORDER.map((key) => NAV_ITEMS[key]);
}

/**
 * Convierte un conjunto de claves en items ordenados por el orden de
 * declaración de `NAV_ITEMS`, sin duplicados.
 */
function keysToItems(keys: ReadonlySet<NavItemKey>): NavItem[] {
  return NAV_ITEM_ORDER.filter((key) => keys.has(key)).map(
    (key) => NAV_ITEMS[key],
  );
}

/**
 * Unión sin duplicados de los items permitidos por los grupos dados, en el
 * orden de declaración de `NAV_ITEMS` e independiente del orden de `groups`.
 * Si el conjunto resultante es vacío (grupos vacíos o desconocidos), usa
 * `DEFAULT_NAV_ITEMS`.
 */
export function resolveNavItems(groups: readonly string[]): NavItem[] {
  const keys = new Set<NavItemKey>();

  for (const group of groups) {
    // Object.hasOwn: evita heredar de Object.prototype con grupos como
    // "constructor" o "toString".
    if (!Object.hasOwn(GROUP_MENU_MAP, group)) continue;
    for (const key of GROUP_MENU_MAP[group]) {
      keys.add(key);
    }
  }

  if (keys.size === 0) {
    for (const key of DEFAULT_NAV_ITEMS) {
      keys.add(key);
    }
  }

  return keysToItems(keys);
}

/**
 * `true` si algún item resuelto para esos grupos tiene un `href` idéntico a
 * la ruta o es un prefijo de ella delimitado por "/". El separador "/" evita
 * que `/radio` matchee `/radio_10`.
 */
export function canAccessRoute(
  groups: readonly string[],
  href: string,
): boolean {
  return resolveNavItems(groups).some((item) => isRouteActive(item.href, href));
}

/**
 * `true` si `pathname` es `itemHref` o una subruta suya delimitada por "/"
 * (`/reportes/detalle`). Usado por el menú (item activo) y por el acceso.
 */
export function isRouteActive(itemHref: string, pathname: string): boolean {
  return pathname === itemHref || pathname.startsWith(itemHref + "/");
}

/**
 * Destino de redirección puro por falta de acceso: primera ruta
 * de `resolveNavItems(groups)` según el orden de configuración, o "/login" si
 * esa lista es vacía. Reutilizable por cliente (grupos del usuario) y servidor
 * (unión de grupos de la sesión).
 */
export function resolveRedirectTarget(groups: readonly string[]): string {
  const items = resolveNavItems(groups);
  return items[0]?.href ?? "/login";
}
