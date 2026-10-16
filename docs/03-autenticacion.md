# 03 — Autenticación con AWS Cognito

> Configuración de Amplify, login, contraseña temporal, logout, tokens y guard de servidor. Es el doc más sensible: lee §1 antes de tocar cualquier archivo de `src/features/auth/` o `src/proxy.ts`.

---

## 1. Modelo mental

- Autenticación con **Amplify v6** contra un **User Pool** de Cognito. Los usuarios se crean en la consola de AWS.
- **El login es opcional.** Sin sesión se ve el catálogo completo de pantallas. Con sesión, la cabecera muestra el usuario y el logout. Los grupos de Cognito **no cierran rutas**.
- Los tokens, cuando hay sesión, se guardan en **cookies** (`{ ssr: true }`).
- La API sigue siendo quien valida el token en cada llamada de datos. Sin sesión, `apiFetch` falla con un mensaje y la pantalla permanece abierta.

```
[Usuario] ──> cualquier ruta ──> se renderiza (sin login)
                │
                └─ cabecera "Iniciar sesión" ──> /login ── signIn ──> [Cognito]
                                                                      │
                                                         tokens en cookies
                                                                      │
                           apiFetch ── Bearer accessToken (si hay sesión) ──> API
```

`src/proxy.ts` **no** redirige a `/login`.

---

## 2. Configuración de Amplify — `ConfigureAmplify.tsx`

- Client Component montado en `src/app/layout.tsx`.
- Si hay User Pool y App Client, llama a `Amplify.configure` **una sola vez**, a nivel de módulo, con `{ ssr: true }`.
- Si faltan `NEXT_PUBLIC_COGNITO_USER_POOL_ID` o `NEXT_PUBLIC_COGNITO_CLIENT_ID`, **no** configura Amplify. La app abre igual. El formulario de login no puede completar `signIn` hasta que esas variables existan.
- **Es el único lugar del proyecto donde se llama a `Amplify.configure`.**

> ⚠️ **Variables en el navegador:** Next solo inyecta en el bundle del cliente las `NEXT_PUBLIC_*` que se leen **literalmente** (`process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID`). Un acceso dinámico (`process.env[clave]`) queda `undefined` en el navegador. Por eso `env.ts` las lee de forma literal en `readRawEnv()`: no lo cambies por un acceso dinámico.

---

## 3. Login — `LoginPage.tsx`

Formulario propio (no `<Authenticator>`) con dos fases: `credentials` y `newPassword`.

**Al montar:**

1. `getCurrentUser()` con timeout de 10 s. Mientras tanto muestra "Verificando sesión…" y oculta el formulario.
2. Si no hay sesión, hay error o se cumple el timeout → muestra el formulario.
3. Si hay sesión → aplica la **redirección post-login** (abajo).

**Fase `credentials`:**

1. Valida en el momento, sin esperar a Cognito, que usuario y contraseña no estén vacíos.
2. `signIn({ username, password })`:
   - `isSignedIn` → redirección post-login.
   - `nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"` → pasa a la fase `newPassword`.
   - Error → reactiva el botón, conserva el usuario, limpia la contraseña y muestra el mensaje traducido.

**Redirección post-login:**

```ts
const home = catalogNavItems()[0]?.href ?? "/";
router.replace(home);
```

El usuario entra a la primera pantalla del catálogo aunque no tenga grupos. En `/login` hay un enlace para volver sin identificarse.

> No uses `resolveRedirectTarget([])` para decidir si la persona puede entrar: con el login opcional la app ya está abierta.

---

## 4. Cambio de contraseña temporal

Si el usuario fue creado con contraseña temporal, Cognito exige cambiarla en el primer login (fase `newPassword`):

- Dos campos: nueva contraseña y confirmación. Se valida en el momento que no estén vacíos y que coincidan.
- `confirmSignIn({ challengeResponse: newPassword })`. Con `isSignedIn` → redirección post-login.
- `NotAuthorizedException` (el challenge expiró) → vuelve a `credentials`.
- `InvalidPasswordException` u otro error → se queda en `newPassword` con el mensaje de política.

**Flujos adicionales** (MFA, "olvidé mi contraseña"): usar las funciones oficiales de `aws-amplify/auth` (`confirmSignIn`, `resetPassword`, `confirmResetPassword`). **Nunca** llamadas manuales a Cognito.

---

## 5. Errores de Cognito — `cognito-errors.ts`

`translateCognitoError(error, phase)` convierte excepciones en mensajes en español:

| Fase | Código | Mensaje |
|---|---|---|
| `credentials` | `NotAuthorizedException` | Usuario o contraseña incorrectos. |
| `credentials` | `UserNotFoundException` | Usuario o contraseña incorrectos. *(ver nota)* |
| `credentials` | `UserNotConfirmedException` | Cuenta pendiente de verificación. |
| cualquiera | `NetworkError` | No se pudo conectar con el servicio de autenticación. Revisa tu conexión. |
| `newPassword` | `InvalidPasswordException` | La contraseña no cumple la política… |
| `newPassword` | `NotAuthorizedException` | La sesión de cambio de contraseña expiró… |
| cualquiera | desconocido | Mensaje genérico de la fase |

- **Nunca** se muestra el código, el nombre técnico ni el texto original de AWS.
- **Nota de seguridad:** `UserNotFoundException` debe mostrar el **mismo** mensaje que una contraseña incorrecta, para no revelar qué usuarios existen. Conviene además activar *Prevent user existence errors* en el App Client.

Para agregar un código nuevo, edita el mapa `MESSAGE_MAP` y su test.

---

## 6. Shell y logout — `MainDashboardLayout.tsx`

- Al montar: `getCurrentUser()` con timeout de 5 s. Mientras tanto muestra `<Spinner label="Verificando sesión" />` y **no** renderiza el contenido.
- Sin sesión, con error o al cumplirse el timeout → shell de invitado con `catalogNavItems()`. La cabecera muestra "Iniciar sesión".
- Con sesión: el mismo catálogo completo. No se consulta `canAccessRoute`.
- Si la sesión superó `NEXT_PUBLIC_SESSION_MAX_MINUTES`, se cierra y la pantalla sigue abierta como invitado.
- **Logout:** `signOut()` y se queda en la ruta actual, ya sin usuario. Si `signOut` falla, muestra "No se pudo cerrar la sesión. Intenta de nuevo."

---

## 7. Guard de servidor — `src/proxy.ts`

> **Next.js 16:** `middleware.ts` pasó a llamarse **`proxy.ts`** y la función exportada es `proxy`. **Corre en Node.js por defecto.** La opción `runtime` **no está permitida** en este archivo: declararla lanza un error. Referencia: [Next.js — proxy.js](https://nextjs.org/docs/app/api-reference/file-conventions/proxy).

### 7.1 Qué hace

Deja pasar la request. No lee la sesión ni redirige.

```ts
export function proxy(request: NextRequest): Response {
  return NextResponse.next({
    request: { headers: request.headers },
  });
}
```

No guarda estado entre requests.

### 7.2 Matcher

```ts
export const config = {
  matcher: [
    // Todo, excepto /login, los internos de Next y los archivos estáticos
    "/((?!login$|login/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
```

- El matcher **no exige sesión**. Evita que el proxy intercepte assets. Una ruta nueva bajo `(dashboard)/` queda servida sin tocar este archivo.
- `login$|login/` excluye exactamente `/login` (y sus subrutas).
- El `matcher` debe ser un literal: Next lo analiza en build y no admite variables.
- **No** agregues `export const runtime`.

### 7.3 Runner de servidor — `amplify-server.ts`

Expone `runWithAmplifyServerContext` de `createServerRunner` (`@aws-amplify/adapter-nextjs`), configurado con `readCognitoEnv()`. En el servidor, siempre se usa el subpath `aws-amplify/auth/server` junto a este runner.

---

## 8. Tokens hacia la API — `src/lib/api-client.ts`

- `authHeaders()` obtiene la sesión con `fetchAuthSession()` (timeout de 10 s) y agrega `Authorization: Bearer <accessToken>`.
- Se usa el **access token**, no el `idToken`: es lo que valida el backend y lo que usan `proxy.ts` y `getUserGroups()`.
- Sin token → lanza "No hay sesión activa. Inicia sesión de nuevo." y **no** envía la request.
- Amplify renueva los tokens automáticamente; no hay refresh manual. El límite de la sesión está en el §9.
- Manejo de respuestas (401, 403, etc.): ver [07 §3](./07-repos-y-contrato-api.md#3-errores).

---

## 9. Duración máxima de la sesión — `session-limit.ts`

La sesión se cierra sola **`NEXT_PUBLIC_SESSION_MAX_MINUTES` minutos después del login** (60 por defecto), aunque el usuario siga activo. Sin esto, Amplify renueva los tokens en silencio y la sesión dura lo que dure el *refresh token* de Cognito (30 días por defecto).

**De dónde sale la hora del login:** del claim `auth_time` del access token. Cognito lo fija al autenticar y lo **conserva** al renovar el token, así que no se guarda nada en el navegador y el cliente y el servidor calculan lo mismo.

| Dónde | Qué hace al vencer |
|---|---|
| `MainDashboardLayout.tsx` | Revisa al entrar a cada ruta. Si sigue vigente, programa el cierre para el minuto exacto y lo revisa de nuevo al volver a la pestaña. Al vencer: `signOut()` y sigue en la misma pantalla como invitado |
| `LoginPage.tsx` | Si encuentra una sesión vencida, la cierra y muestra el formulario. Con `?expired=1` muestra "Tu sesión expiró por tiempo. Inicia sesión de nuevo." |

**Configuración** (en `.env.local` y en cada entorno de Vercel):

```bash
NEXT_PUBLIC_SESSION_MAX_MINUTES=60   # opcional; entero entre 5 y 1440
```

- Vacía o ausente → 60 minutos.
- Un valor inválido (`0`, `60m`, `1.5`, fuera de rango) hace que la app **no arranque** y el error nombra la variable: mejor fallar que dejar sesiones sin límite por un typo.
- Es `NEXT_PUBLIC_`: se fija al compilar. Cambiarla exige reiniciar `npm run dev` o un build nuevo.
- Sin `auth_time` válido en el token, la sesión se trata como vencida (falla cerrada).

**Para que el límite también valga fuera del navegador**, configura en Cognito el App Client con *Refresh token expiration* igual al límite (mínimo 60 min en Cognito). Así, aunque alguien copie el token, no puede renovarlo después de ese tiempo. El access token ya dura 1 h por defecto.

> Es un límite **absoluto** desde el login, no por inactividad. Si más adelante se quiere cerrar por inactividad, se agrega aparte sin tocar este mecanismo.
