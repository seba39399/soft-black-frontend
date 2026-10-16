# 00 — Usar la plantilla

> De "copiado" a "mi dashboard corriendo con mi Cognito". Sigue los pasos en orden; cada uno enlaza al doc con el detalle.

> **Con Cursor (recomendado):** abre la carpeta raíz de la plantilla en Cursor y escribe `/crear-proyecto` en el chat (modo Agent). El agente te pide los datos y ejecuta el inicializador, que hace §2, §3 y §5 por ti. La configuración de Cognito (§4) sigue siendo manual en la consola de AWS.

---

## 1. Antes de empezar, necesitas

- **Node.js 22.15.1** gestionado con NVM (ver [06 §2](./06-entorno-y-deploy.md#2-nodejs-2215-con-nvm)).
- Acceso a la **consola de AWS Cognito** (o a alguien que te cree el User Pool).
- La **URL base de la API** del backend. Si aún no existe, puedes arrancar sin ella: el login funciona igual y solo fallarán las pantallas que pidan datos.

---

## 2. Crear el proyecto con el inicializador

La plantilla trae en su carpeta raíz `inicializar.mjs`, que crea el frontend **y** el backend de un proyecto nuevo con todos los nombres cambiados. No se copia nada a mano.

```powershell
cd "<carpeta de la plantilla>"      # la carpeta raíz, la que contiene inicializar.mjs
node inicializar.mjs
```

Te pide:

| Dato | Ejemplo | Se usa en |
|---|---|---|
| Nombre técnico (kebab-case) | `ventas-app` | Carpetas, `package.json`, stack de SAM, tabla, servicio, documentación |
| Nombre visible | `Dashboards de Ventas` | Título de la pestaña, sidebar y login (`app-config.ts`) |
| Descripción | `Indicadores comerciales` | Metadata de la app |
| Región de AWS | `us-east-1` | `samconfig.toml` y documentación |
| Prefijo de perfiles de AWS | `ventas-app` → `ventas-app-dev` / `ventas-app-prod` | `samconfig.toml` y documentación |
| Cognito dev y prod (opcional) | `us-east-1_AbC123` y el App Client ID | `.env.local` y `samconfig.toml` |
| Dominio de producción (opcional) | `https://ventas.miempresa.com` | CORS del backend en prod |
| Carpeta destino | `D:\DEV\ventas-app` | Donde se crean `ventas-app-frontend` y `ventas-app-backend` |

Lo que no sepas todavía (por ejemplo, los datos de producción) déjalo vacío: queda un marcador `<...>` que completas después.

Para automatizarlo, pasa los datos como opciones: `node inicializar.mjs --ayuda` las lista.

---

## 3. Qué hace el inicializador y qué queda para ti

**Lo hace solo:**

- Copia las carpetas frontend y backend de la plantilla al destino, **sin** `node_modules/`, `.next/`, `.venv/`, `.aws-sam/`, cachés ni el `.env.local` de la plantilla.
- Reemplaza el nombre técnico, el visible, la descripción, la región, los perfiles y los datos de Cognito en código, configuración y documentación.
- Crea el `.env.local` del frontend y un `CHANGELOG.md` nuevo (`0.1.0`, creado desde la plantilla `v<versión>`).
- Guarda los datos usados en `proyecto.json`, en la carpeta destino.
- No ejecuta git ni modifica la plantilla.

**Queda para ti:**

| Qué | Dónde | Acción |
|---|---|---|
| Dashboard de ejemplo | `src/app/(dashboard)/dashboard_1/` y `src/features/dashboard_1/` | Déjalo hasta tener tu primera pantalla y luego bórralo junto con su entrada en `nav-config.ts` |
| Grupo de ejemplo | `nav-config.ts` → `GROUP_MENU_MAP.admin` | Reemplazar por los grupos reales de tu User Pool |

---

## 4. Configurar Cognito (consola de AWS)

1. Crear (o reutilizar) un **User Pool**.
2. Crear un **App Client público**: *sin client secret*. Con secret, el login desde el navegador no funciona.
3. Crear los **grupos** (por ejemplo `admin`, `ventas`). Los nombres deben coincidir **exactamente** (mayúsculas incluidas) con las claves de `GROUP_MENU_MAP`.
4. Crear un usuario de prueba y asignarlo a un grupo. Cognito le da una contraseña temporal; la plantilla pide cambiarla en el primer login.
5. Anotar el **User Pool ID** (`us-east-1_AbC123`) y el **App Client ID**.

Detalle en [03](./03-autenticacion.md) y [04](./04-autorizacion.md).

---

## 5. Variables de entorno

```bash
cp .env.example .env.local
```

Completa las tres variables (detalle en [06 §3](./06-entorno-y-deploy.md#3-variables-de-entorno)):

```bash
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_AbC123
NEXT_PUBLIC_COGNITO_CLIENT_ID=1a2b3c4d5e6f7g8h9i0j
NEXT_PUBLIC_API_BASE_URL=https://api.ejemplo.com
```

---

## 6. Instalar y arrancar

```bash
nvm use vercel    # alias → Node 22.15.1 (ver docs/06 §2). En macOS/Linux también sirve `nvm use`
npm ci             # instala exactamente lo de package-lock.json
                   # (primera vez, si aún no hay package-lock.json: npm install)
npm run dev
```

Abre `http://localhost:3000`:

1. Entras directo a `/inicio`. No pide login.
2. En la cabecera, "Iniciar sesión" abre `/login` si quieres identificarte.
3. También puedes seguir sin cuenta: "Continuar sin iniciar sesión" vuelve a la app.

Si algo falla, revisa [09 — Troubleshooting](./09-troubleshooting.md).

---

## 7. Verificar antes del primer commit

```bash
npm run verify     # lint + typecheck + tests + build
```

Debe terminar sin errores. Es la misma "definición de terminado" que se usa en todo el proyecto (ver [05 §10](./05-convenciones-y-testing.md#10-definición-de-terminado)).

---

## 8. Tu primera pantalla

Sigue [02 §5 — Agregar un dashboard](./02-arquitectura.md#5-agregar-un-dashboard-paso-a-paso). Si tu pantalla necesita un endpoint que el backend aún no tiene, primero se propone en el contrato del backend ([07 §6](./07-repos-y-contrato-api.md#6-cambios-al-contrato)).

---

## 9. Desplegar

Ver [06 §5 — Despliegue](./06-entorno-y-deploy.md#5-despliegue). En resumen: Node 22.x en el host, las tres variables `NEXT_PUBLIC_*` cargadas y `npm run build`.
