# 10 — Trabajar con Cursor

> Cómo se reparte la información entre `docs/`, las reglas de `.cursor/rules/`, `docs/agente/` y las skills, para que el agente de Cursor tenga el contexto correcto sin copias que se desincronicen.

---

## 1. Quién es la fuente de qué

| Dónde | Qué contiene | Cuándo lo usa Cursor |
|---|---|---|
| `docs/` (00–09) | **Las normas**: arquitectura, auth, convenciones, contrato, git | Cuando una regla o skill lo enlaza |
| `docs/agente/` | **Fuente** de las reglas cortas para el agente y de los procedimientos paso a paso. Enlazan a `docs/`, no copian | A través de las reglas y skills |
| `.cursor/rules/*.mdc` | Las reglas de `docs/agente/` con su *frontmatter* de Cursor (copia) + `proyecto.mdc` | Según el tipo de regla (§2) |
| `.cursor/skills/` | `/nuevo-dashboard`: leen el procedimiento de `docs/agente/` | Cuando los invocas (o cuando el agente detecta que aplican) |

**Regla de oro:** si cambias una regla, edita `docs/agente/<archivo>.md` y vuelve a copiar su contenido debajo del *frontmatter* del `.mdc` correspondiente. Si una regla y un doc numerado se contradicen, manda el doc.

---

## 2. Reglas (`.cursor/rules/`)

| Archivo | Tipo | Cuándo se aplica |
|---|---|---|
| `proyecto.mdc` | `alwaysApply: true` | Siempre: comandos, git, `.env.local`, contrato, qué skills existen |
| `arquitectura.mdc` | `alwaysApply: true` | Siempre: estructura, Next 16 y convenciones |
| `git-workflow.mdc` | `alwaysApply: true` | Siempre: resumen de [08](./08-git.md) |
| `auth.mdc` | `globs: src/features/auth/**,src/proxy.ts` | Al tocar login, sesión, Amplify o el proxy |
| `autorizacion.mdc` | `globs: src/features/main-dashboard/**` | Al tocar el menú o `nav-config.ts` |

Revisa en *Cursor Settings → Rules* que aparezcan las cinco. **Tamaño:** las reglas `alwaysApply` van en cada conversación; mantenlas cortas y deja el detalle en los docs.

---

## 3. Uso diario

Abre la carpeta `C:\Users\Subocol\Documents\soft-black-frontend-frontend` en Cursor y usa el chat en modo **Agent**.

- **Agregar un dashboard:** `/nuevo-dashboard reportes de ventas por región para los grupos admin y ventas`.
- **Cambio grande o dudoso:** usa el modo **Plan** (selector de modo del chat) o pide primero un `SPEC.md`; revisa y aprueba antes de que toque archivos. Cursor no bloquea la implementación sin aprobación: las reglas le piden detenerse, pero la aprobación la das tú.
- **Tareas sin relación:** abre un chat nuevo para cada una.
- **Antes de dar algo por terminado:** `npm run verify` (el agente lo corre; pide ver la salida).

---

## 4. Crear un proyecto nuevo con Cursor

Los proyectos nuevos se crean desde la **carpeta raíz de la plantilla** (la que contiene `inicializar.mjs`), no copiando carpetas a mano.

1. Abre la carpeta raíz de la plantilla en Cursor.
2. Escribe `/crear-proyecto` en el chat (modo Agent).
3. Responde los datos que pide (nombre técnico, nombre visible, región, perfiles de AWS, Cognito, carpeta destino). El agente ejecuta `inicializar.mjs`, que crea el frontend y el backend con todo renombrado. No ejecuta git.
4. Abre el proyecto nuevo para trabajar en él.

Sin agente: `node inicializar.mjs` desde la carpeta raíz ([00 §2](./00-usar-la-plantilla.md#2-crear-el-proyecto-con-el-inicializador)).

## 5. Agregar un procedimiento nuevo

1. Escribe los pasos en `docs/agente/<nombre>.md`, enlazando a los docs numerados.
2. Crea `.cursor/skills/<nombre>/SKILL.md` con `name`, `description` (cuándo usarla) y una línea: "Lee `docs/agente/<nombre>.md` y síguelo exactamente".
3. Menciónalo en `.cursor/rules/proyecto.mdc`.

---

## Opcional: seguimiento de tareas con Task Master (MCP)

Cursor no guarda el avance de las tareas entre sesiones. Si lo necesitas, agrega el servidor MCP **Task Master AI**: convierte un documento de requisitos en tareas con dependencias, te dice cuál sigue y guarda el estado en el proyecto (carpeta `.taskmaster/`).

1. Crea `.cursor/mcp.json`:
   ```json
   {
     "mcpServers": {
       "task-master-ai": {
         "command": "npx",
         "args": ["-y", "task-master-ai"],
         "env": { "ANTHROPIC_API_KEY": "<tu llave>" }
       }
     }
   }
   ```
   Task Master llama a un modelo con **su propia llave de API** (Anthropic, OpenAI u otro proveedor que soporte). No la subas a git: agrega `.cursor/mcp.json` a `.gitignore` o usa una variable de entorno del sistema.
2. Reinicia Cursor y revisa en *Settings → MCP* que aparezca activo.
3. En el chat: "Inicializa Task Master en este proyecto", luego "Genera las tareas a partir de `<tu-spec>.md`" y "¿Cuál es la siguiente tarea?".

Documentación: <https://github.com/eyaltoledano/claude-task-master>.
