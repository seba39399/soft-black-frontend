# 09 — Troubleshooting

> Problemas frecuentes, ordenados por el momento en que aparecen. Si resuelves uno nuevo, agrégalo aquí.

---

## Instalación

### `npm install` falla con `ETARGET` en un paquete `@aws-amplify/*`

Probablemente se escribió una versión que no existe. `@aws-amplify/adapter-nextjs` numera sus versiones como **1.x**, no como `aws-amplify` (6.x). Usa las versiones de [01 §2](./01-vision-y-stack.md#2-stack).

### `proxy.ts` no compila: "Argument of type 'ContextSpec' is not assignable…"

Hay dos versiones de `@aws-amplify/core` instaladas. Revisa con `npm ls @aws-amplify/core` y actualiza juntos `aws-amplify`, `@aws-amplify/adapter-nextjs` y `@aws-amplify/ui-react` hasta que quede una sola.

### "package.json is not parseable: invalid JSON: expected value at line 1 column 1"

El archivo tiene BOM UTF-8 (lo agregan algunas herramientas de Windows). En VS Code: barra de estado → "UTF-8 with BOM" → *Save with Encoding* → **UTF-8**. El `.editorconfig` del repo ya pide UTF-8 sin BOM a los editores que lo respetan.

### `npm install` falla con `EBADENGINE` / "Unsupported engine"

Estás usando una versión de Node fuera de `>=22.15.0 <23`. `.npmrc` tiene `engine-strict=true` a propósito.

```bash
node -v                 # debe decir v22.x (≥ 22.15.0)
nvm use vercel
```

### PowerShell: "no se puede cargar el archivo npm.ps1… la ejecución de scripts está deshabilitada"

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

o ejecuta a través de cmd: `cmd /c "npm install"`.

### `nvm use` no hace nada en Windows

nvm-windows no lee `.nvmrc`. Usa `nvm use vercel`. Si sigue sin cambiar, abre la terminal **como administrador** una vez (nvm-windows necesita crear un symlink).

---

## Arranque

### "Faltan variables de entorno requeridas: NEXT_PUBLIC_…"

La app abre aunque falten las variables de Cognito. Este error sale al llamar a la API (`NEXT_PUBLIC_API_BASE_URL`) o al runner de servidor si le faltan User Pool y App Client.

- ¿Existe `.env.local` en la **raíz** del proyecto (junto a `package.json`)?
- ¿Las variables tienen valor y no solo el nombre?
- ¿Reiniciaste `npm run dev` después de editar el archivo? Las `NEXT_PUBLIC_*` se leen al arrancar.
- Si el error aparece **solo en el navegador** y en el servidor no: alguien cambió `env.ts` para leer las variables de forma dinámica (`process.env[clave]`). Deben leerse literalmente ([03 §2](./03-autenticacion.md#2-configuración-de-amplify--configureamplifytsx)).

### El build falla por `runtime` en `proxy.ts`

Next 16 no admite `export const runtime` en el proxy (ya corre en Node). Borra esa línea. Ver [03 §7](./03-autenticacion.md#7-guard-de-servidor--srcproxyts).

---

## Login

### Inicio sesión bien, pero me quedo en `/login`

La app ya no te deja ahí por falta de grupos: tras un login válido vas a la primera ruta de `NAV_ITEMS`. Si el formulario no avanza, revisa la consola del navegador.

### "Usuario o contraseña incorrectos" con datos correctos

- ¿El usuario está en **este** User Pool? Revisa `NEXT_PUBLIC_COGNITO_USER_POOL_ID`.
- ¿El App Client tiene habilitado el flujo **`ALLOW_USER_SRP_AUTH`**? Amplify usa SRP por defecto.
- ¿El App Client tiene **client secret**? Si lo tiene, crea otro sin secret. Uno que ya tiene secret no se puede cambiar.

### "La contraseña no cumple la política…"

La política la define el User Pool (longitud, mayúsculas, números, símbolos). Revísala en la consola: *User pool → Sign-in → Password policy*.

### El usuario cambió de grupo

El menú ya no depende del grupo: muestra todo `NAV_ITEMS`. El grupo sigue viajando en el token y la API puede responder 403 si el backend no autoriza el dato.

---

## Navegación y acceso

### Agregué un dashboard y no aparece en el menú

¿Está en `NAV_ITEMS`? El menú es el catálogo completo. `GROUP_MENU_MAP` no lo filtra.

### Entro por URL a un dashboard

Si la ruta está en `NAV_ITEMS`, entra. `proxy.ts` no redirige a `/login`.

### Los estilos o las imágenes no cargan

El `matcher` de `proxy.ts` puede estar capturando los assets. Si agregaste archivos en `public/` con una extensión nueva (por ejemplo `.webmanifest` o `.woff2`), súmala a la exclusión del matcher ([03 §7.2](./03-autenticacion.md#72-matcher)).

---

## Datos (API)

### "Tu sesión expiró. Inicia sesión de nuevo."

La API respondió 401 y el mensaje queda en la pantalla. No redirige a `/login`. Casi siempre lo responde API Gateway (cuerpo `{"message":"Unauthorized"}`), antes de llegar a la Lambda:

- ¿Las tres variables son del **mismo entorno**? Un token del pool de `dev` no sirve contra la API de `prod`.
- ¿El App Client de tu `.env.local` está en `CognitoClientIds` del `samconfig.toml` del backend para ese entorno?
- El frontend envía el **access token**; si probaste con `curl`, verifica que no usaste el id token.

### "Tu sesión expiró por tiempo. Inicia sesión de nuevo."

Funciona como debe: pasaron `NEXT_PUBLIC_SESSION_MAX_MINUTES` minutos (60 por defecto) desde el login ([03 §9](./03-autenticacion.md#9-duración-máxima-de-la-sesión--session-limitts)). Si pasa mucho antes de lo esperado, revisa que la hora del equipo sea correcta: el límite se calcula con el reloj del navegador y el `auth_time` del token.

### "No tienes permiso para ver esta información." (403)

Tu grupo ve el dashboard en el menú (`GROUP_MENU_MAP`) pero el backend no lo autoriza en `RESOURCE_GROUPS`. Deben coincidir ([04 §7](./04-autorizacion.md#7-reglas)). `GET /v1/me/permissions` muestra qué grupos y recursos ve el backend para tu usuario.

### Error de CORS en la consola del navegador

Lo resuelve el **backend**: el origen exacto del front (protocolo, dominio y puerto, sin barra final; `http://localhost:3000` en desarrollo) debe estar en `AllowedOrigins` del `samconfig.toml` de ese entorno, y hay que redesplegar. No se "arregla" desde Next. Un 401 también puede verse como error de CORS si el origen no está permitido: arregla el origen primero.

### "No se pudo conectar con el servidor"

- ¿`NEXT_PUBLIC_API_BASE_URL` es correcta y **sin barra final**?
- ¿La API responde? `curl <ApiUrl>/v1/health` debe devolver `{"status":"ok"}` sin token.
- Si la Lambda sí terminó, tardó más de 15 s (el corte del frontend): es un problema del backend.

### 400 con un `cursor`

El `cursor` se reenvía **tal cual** vino en `nextCursor`. Si lo modificas, lo decodificas o lo reutilizas de otro listado, el backend responde `VALIDATION_ERROR` ([07 §4](./07-repos-y-contrato-api.md#4-paginación-por-cursor)).

---

## Cursor

### `/nuevo-dashboard` no aparece

Revisa que exista `.cursor/skills/<nombre>/SKILL.md` y que el chat esté en modo **Agent**. Si acabas de copiar la carpeta, reinicia Cursor.

### El agente escribe `middleware.ts` o `export const runtime`

Está usando lo que sabe de versiones anteriores de Next. Revisa en *Cursor Settings → Rules* que `arquitectura.mdc` esté activa (siempre aplicada) y pídele que consulte `node_modules/next/dist/docs/`.
