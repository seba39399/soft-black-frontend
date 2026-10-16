# Menú (login opcional)

- `NAV_ITEMS` es la fuente del menú. El shell usa `catalogNavItems()`: el login es opcional y las rutas están abiertas.
- `GROUP_MENU_MAP` sigue en el archivo. No filtra el menú ni cierra rutas.
- `DEFAULT_NAV_ITEMS` se queda en `[]`. No afecta al shell.
- Las funciones de `nav-config.ts` son puras y tienen tests de propiedades en `tests/features/main-dashboard/nav-config.test.ts`. Si cambias `resolveNavItems`, los tests deben seguir pasando.
- Buscar grupos con `Object.hasOwn(GROUP_MENU_MAP, group)`, nunca `GROUP_MENU_MAP[group]` directo (evita `"constructor"`, `"toString"`…).
- `AppHeader` y `TopNav` reciben `navItems` por props; nunca listas de menú escritas a mano.

Detalle: `docs/04-autorizacion.md`
