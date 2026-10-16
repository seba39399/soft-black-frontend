# 06 — Entorno y despliegue

> Node, variables de entorno, scripts y despliegue. **Esta es la única copia del setup**: el README raíz enlaza aquí.

---

## 1. Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| **Node.js** | `22.15.1` | Runtime de desarrollo, build y despliegue |
| **npm** | La que trae Node 22.15.1 | Gestor de paquetes |
| **NVM** | nvm (macOS/Linux) o nvm-windows | Tener la versión exacta de Node sin afectar otros proyectos |
| **Cognito** | User Pool + App Client público | Autenticación (ver [00 §4](./00-usar-la-plantilla.md#4-configurar-cognito-consola-de-aws)) |

---

## 2. Node.js 22.15 con NVM

La versión está fijada **en el repo**, no en la máquina de cada persona:

| Archivo | Contenido | Efecto |
|---|---|---|
| `.nvmrc` | `22.15.1` | `nvm use` elige la versión correcta (macOS/Linux). En Windows se usa el alias `vercel` |
| `package.json` → `engines` | `"node": ">=22.15.1 <23"` | Vercel usa Node 22.x y npm avisa si usas otra versión |
| `.npmrc` | `engine-strict=true` | `npm install` **falla** con una versión de Node incorrecta |

### macOS / Linux (nvm)

```bash
nvm install        # lee .nvmrc e instala 22.15.1
nvm use            # la activa en esta terminal
node -v            # v22.15.1
```

### Windows (nvm-windows) — alias `vercel`

nvm-windows no lee `.nvmrc`. La convención del equipo es un alias `vercel` que apunta a la versión del proyecto:

```powershell
nvm install 22.15.1
nvm alias vercel 22.15.1   # una sola vez
nvm use vercel             # en cada terminal nueva
node -v                    # v22.15.1
```

> Si tu versión de nvm-windows no soporta `nvm alias`, usa directamente `nvm use 22.15.1`. Cualquier 22.x desde 22.15.0 cumple `engines`; el alias solo evita que cada persona recuerde el número exacto.

**¿Por qué 22 y no 20?** Node 20 terminó su soporte el 30 de abril de 2026 y Vercel lo retira el 1 de octubre de 2026. Node 22 es LTS con soporte hasta abril de 2027 y cumple el mínimo de Next 16 (≥ 20.9). Antes de abril de 2027 hay que planear el paso a Node 24 LTS: se cambian `.nvmrc`, `engines` y `@types/node`, y se actualiza esta sección.

---

## 3. Variables de entorno

Son **públicas** (`NEXT_PUBLIC_`). Cognito hace falta para **iniciar sesión**. Sin User Pool o sin App Client la app igual abre: el login queda sin servicio. `NEXT_PUBLIC_API_BASE_URL` hace falta cuando una pantalla llama a la API.

| Variable | Qué es | Ejemplo |
|---|---|---|
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | ID del User Pool. Amplify saca la región de aquí (`<región>_xxxx`) | `us-east-1_AbC123` |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | ID del App Client **público** (sin secret) | `1a2b3c4d5e6f7g8h9i0j` |
| `NEXT_PUBLIC_API_BASE_URL` | URL base de la API, **sin barra final**. Es la salida `ApiUrl` del stack de SAM del backend | `https://abc123.execute-api.us-east-1.amazonaws.com/dev` |
| `NEXT_PUBLIC_SESSION_MAX_MINUTES` | *Opcional.* Minutos que dura la sesión desde el login (entero de 5 a 1440; por defecto 60). Ver [03 §9](./03-autenticacion.md#9-duración-máxima-de-la-sesión--session-limitts) | `60` |

```bash
cp .env.example .env.local   # y completa los valores
```

- `.env.local` **no** se versiona (está en `.gitignore`). `.env.example` sí, con los valores vacíos.
- No hay variable de región ni credenciales de AWS.
- `NEXT_PUBLIC_API_BASE_URL` vacía no impide abrir las pantallas. Falla la llamada cuando una pantalla usa `apiFetch` (`env.ts`).
- `NEXT_PUBLIC_SESSION_MAX_MINUTES` inválida (no vacía) hace que la app no arranque.

### Un juego de variables por entorno

`dev` y `prod` son **cuentas de AWS distintas**, cada una con su User Pool y su API. Las tres variables cambian **juntas**:

| Variable | `dev` (local y Preview) | `prod` (Production) |
|---|---|---|
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | User Pool de la cuenta dev | User Pool de la cuenta prod |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | App Client de dev | App Client de prod |
| `NEXT_PUBLIC_API_BASE_URL` | `ApiUrl` del stack `dev` | `ApiUrl` del stack `prod` |

Mezclarlas (pool de dev con API de prod) produce 401 en todas las llamadas. Del lado del backend, en `samconfig.toml` de cada entorno:

- `CognitoClientIds` incluye el App Client del frontend de ese entorno.
- `AllowedOrigins` incluye el origen del frontend (`http://localhost:3000` en dev, el dominio real en prod).

- **Las `NEXT_PUBLIC_*` se inyectan al compilar.** Si las cambias, reinicia `npm run dev`. En el host, cambiarlas exige un **nuevo build**, no basta con reiniciar.

---

## 4. Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en `http://localhost:3000` |
| `npm run build` | Build de producción (incluye verificación de tipos) |
| `npm run start` | Sirve el build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificación de tipos (`tsc --noEmit`) |
| `npm test` | Tests (una pasada) |
| `npm run test:watch` | Tests en modo watch |
| `npm run verify` | `lint` + `typecheck` + `test` + `build`: lo que debe pasar antes de un PR |

**Instalar dependencias:** `npm ci` si ya existe `package-lock.json` (instala exactamente lo que dice el lock). `npm install` solo para agregar o actualizar paquetes, y el lock actualizado se commitea.

### Windows / PowerShell

Si PowerShell bloquea `npm` ("la ejecución de scripts está deshabilitada"):

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

o ejecuta a través de cmd: `cmd /c "npm run dev"`.

---

## 5. Despliegue

Pensado para **Vercel**. Sirve cualquier host que soporte Next.js 16 con runtime Node.

1. **Node:** en Vercel, *Project Settings → Build and Deployment → Node.js Version* = **22.x**. Vercel también lo toma de `engines`.
2. **Variables:** carga las tres `NEXT_PUBLIC_*` en cada entorno de Vercel: **Production** con los valores de `prod`; **Preview** y **Development** con los de `dev` (ver §3). Agrega el dominio de cada entorno a `AllowedOrigins` del backend.
3. **Build:** `npm run build`. Vercel lo corre solo.
4. **Cognito:** no hay *callback URLs* que configurar (el login es propio, no Hosted UI). Si algún día se usa Hosted UI u OAuth, agrega los dominios del host en el App Client.

Notas:

- No se necesitan credenciales de AWS en el host.
- `src/proxy.ts` corre en Node (el default de Next 16); no hay nada que configurar.
- Si cargas imágenes de dominios externos, configura `images.remotePatterns` en `next.config.ts`.

---

## 6. Checklist de entorno

- [ ] `node -v` → `v22.15.1`
- [ ] `.env.local` con las tres variables
- [ ] App Client **sin** secret
- [ ] Las tres variables son del **mismo** entorno (pool, client y API)
- [ ] Grupos de Cognito iguales a las claves de `GROUP_MENU_MAP` y a los de `RESOURCE_GROUPS` del backend, en **ambos** pools
- [ ] Origen del frontend en `AllowedOrigins` y App Client en `CognitoClientIds` del backend
- [ ] Usuario de prueba asignado a un grupo
- [ ] `npm run verify` sin errores
