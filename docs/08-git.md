# 08 — Git: ramas, commits y trazabilidad

> Cómo se versiona el trabajo. El historial de Git es la **bitácora** del proyecto: qué se hizo, en qué orden y bajo qué tarea. **Esta es la única copia**: `docs/agente/git-workflow.md` enlaza aquí.

---

## 1. Ramas

### 1.1 Ramas base

| Rama | Propósito | Se actualiza desde |
|---|---|---|
| `main` | Producción. Siempre desplegable | `develop`, en cortes estables |
| `develop` | Integración | Ramas de trabajo |

Nadie commitea directamente en `main` ni en `develop`.

### 1.2 Ramas de trabajo

```
<tipo>/<nombre>
```

| `<tipo>` | Para |
|---|---|
| `feature` | Funcionalidad nueva (por ejemplo un dashboard) |
| `fix` | Corrección |
| `chore` | Configuración, dependencias, tooling |
| `docs` | Solo documentación |

`<nombre>` es el **nombre del feature** (o de la tarea), o un slug corto. Si el nombre usa guion bajo porque coincide con una ruta (`orden_servicio`), la rama lo conserva.

```
feature/reportes
feature/orden_servicio
fix/login-redirect
chore/node-22
docs/guia-despliegue
```

### 1.3 Reglas

```bash
git switch develop
git pull
git switch -c feature/<nombre>
```

- La rama se crea **antes** de empezar a implementar.
- **Una rama = una spec o un trabajo.** No se mezclan.
- Al terminar: PR a `develop`. `main` se actualiza desde `develop`.
- No se modifica `git config` como parte del flujo.

---

## 2. Commits

### 2.1 Formato

```
<slug>: <hito> — <resumen en español>
```

- `<slug>`: nombre de la spec, o `chore` / `docs` / `fix` si es trabajo sin spec.
- `<hito>`: `requirements`, `design`, `tasks` o un rango de tareas (`tasks 1-4`).
- `<resumen>`: qué incluye, en pocas palabras.

```
reportes: requirements y design
reportes: tasks 1-3 — tipos, reportes-api y format
reportes: tasks 4-6 — ReportesPage, ruta y nav-config
fix: login — redirigir según grupos tras signIn
chore: node 22.15 (.nvmrc, engines, .npmrc)
docs: guía de despliegue — pasos para Vercel
```

### 2.2 Reglas

- **Un commit por hito**, no un único commit gigante. El `git log` debe contar el orden real del trabajo.
- Si hay un `SPEC.md` o un plan escrito, se commitea **antes** que el código que implementa.
- **Staging selectivo:** `git add <ruta>`, no `git add .` ni `git add -A`.
- Sin `--amend` sobre commits ya pusheados. Sin `--no-verify`.
- Mensajes en español.

### 2.3 Trazabilidad

```bash
git log --oneline --grep="^reportes:"
```

El plan o `SPEC.md` dice **qué** falta. Git dice **cuándo** y **en qué orden** se hizo.

---

## 3. Push y PRs

- **No se hace `git push` sin confirmación explícita del responsable.** Aplica también a los agentes (Cursor).
- Primera subida de una rama: `git push -u origin <tipo>/<nombre>`.
- Nunca `push --force` sobre ramas compartidas.
- Antes de abrir el PR: `npm run verify` (ver [05 §10](./05-convenciones-y-testing.md#10-definición-de-terminado)).
- En la descripción del PR: qué spec cubre, cómo se probó y qué docs se tocaron.

---

## 4. Finales de línea

El repo guarda todo el texto con **LF** gracias a `.gitattributes`:

```gitattributes
* text=auto eol=lf
*.bat  text eol=crlf
*.cmd  text eol=crlf
*.ps1  text eol=crlf
*.png  binary
*.jpg  binary
*.ico  binary
*.woff2 binary
*.pdf  binary
```

En Windows, el aviso `LF will be replaced by CRLF` al hacer `git add` es esperado y no afecta lo que se guarda.

---

## 5. Checklist por spec

- [ ] Rama `<tipo>/<nombre>` creada desde `develop` actualizado.
- [ ] Commits por hito: `requirements` → `design` → `tasks` → implementación por rangos.
- [ ] `SPEC.md` o plan (si lo hay) commiteado antes que su implementación.
- [ ] Staging por archivo.
- [ ] `npm run verify` sin errores.
- [ ] Push solo con confirmación, con `-u` la primera vez.
