# Agregar un dashboard

Sigue **exactamente** el procedimiento de `docs/02-arquitectura.md` §5. En orden:

1. **Contrato primero.** Si la pantalla necesita datos, búscalos en `docs/contrato/openapi.yaml` (copia del contrato del backend). Si el endpoint no existe, **no lo inventes ni edites esa copia**: redacta la propuesta (ruta, parámetros, esquema de respuesta, recurso) para que se agregue al `openapi.yaml` del backend y espera a que se acuerde. Los listados usan `CursorPage<T>` (`docs/07` §4).
2. **Feature** `src/features/<nombre>/` con `types.ts`, `utils/<nombre>-api.ts` (usa `apiFetch`), otros `utils/` puros y `components/<Nombre>Page.tsx` con `useApiQuery` y los cuatro estados (`Spinner`, `ErrorState`, `EmptyState`, datos).
3. **Ruta** `src/app/(dashboard)/<nombre>/page.tsx`: solo importa y renderiza `<Nombre>Page`.
4. **`nav-config.ts`**: entrada en `NAV_ITEMS` y en `GROUP_MENU_MAP` para los grupos indicados por el usuario. Pregunta los grupos si no los dieron.
5. **No** toques `src/proxy.ts`.
6. **Tests** de todo `utils/` puro en `tests/features/<nombre>/`.
7. `npm run verify`.

Recuérdale al usuario crear los grupos en Cognito si son nuevos.

Lee antes de empezar: `docs/02-arquitectura.md`, `docs/07-repos-y-contrato-api.md`, `docs/contrato/openapi.yaml`
