# Seguridad

## Política de secretos

**Ninguna credencial, token o clave se guarda en el repositorio.**

| Secreto | Dónde vive | Cómo se usa |
|---|---|---|
| PAT de Azure DevOps (uso local con `az`) | Almacén de credenciales de Windows (`az devops login`) o variable de entorno de la sesión (`AZURE_DEVOPS_EXT_PAT`) | Nunca en archivos del repo ni en scripts |
| Token del agente autohospedado | Solo durante el registro del agente; no se guarda en el repo | *Planificado (Fase 2)* |
| Variables sensibles del pipeline | Variables secretas o Variable Group de Azure Pipelines | *Planificado (Fase 2)* |
| Secretos de GitHub Actions | GitHub → Settings → Secrets and variables → Actions | *Planificado (Fase 2)* |

Controles preventivos:

- `.gitignore` excluye `.env`, `.env.*` (menos `.env.example`) y `*.pat`.
- Los scripts de `devops/scripts/` leen el PAT del entorno; no lo reciben como parámetro ni lo escriben en disco.
- El checklist del PR incluye: "No hay credenciales, tokens ni claves en el código".
- *Planificado (Fase 2):* secret scanning y push protection de GitHub (disponibles gratis en repos públicos).

## Incidentes de seguridad

| Fecha | Incidente | Respuesta | Lección |
|---|---|---|---|
| 2026-10-28 | El PAT de Azure DevOps se expuso en texto plano fuera de la terminal (pegado en un chat) | Se **regeneró** de inmediato desde *User settings → Personal access tokens*, lo que invalidó el valor expuesto. El token nuevo se guardó con `az devops login` | Los tokens solo se introducen en la terminal o en un almacén de secretos, nunca en mensajes ni documentos. Se adoptó `az devops login` para no manejar el token a mano |

## Controles en la aplicación

| Riesgo | Control | Ubicación |
|---|---|---|
| Datos inválidos o maliciosos en la API | Validación de tipos, campos obligatorios, longitud máxima y valores permitidos (enum) | `backend/src/models/incident.js` |
| JSON mal formado | Responde 400 sin exponer detalles internos | `backend/src/app.js` |
| Fuga de información en errores | Los errores 500 responden un mensaje genérico; el detalle solo va al log del servidor | `backend/src/app.js` |
| XSS al renderizar datos del usuario | `escapeHtml()` antes de insertar texto con `innerHTML` | `frontend/src/app.js` |
| Inyección en URLs | `encodeURIComponent()` en los IDs de las rutas | `frontend/src/api.js` |
| Filtros arbitrarios | `status` y `priority` se validan contra listas permitidas | `backend/src/routes/incidents.js` |

## Controles en el proceso

- `main` protegida: todo cambio pasa por un PR revisado.
- Análisis de dependencias con `npm audit` (ver [dependencias.md](dependencias.md)). *Planificado (Fase 2):* que falle el pipeline si hay vulnerabilidades altas o críticas, y Dependabot.
- PAT con permisos mínimos: solo Work Items, Code, Build y Agent Pools, y con vencimiento.

## Riesgos conocidos

| Riesgo | Estado |
|---|---|
| Sin autenticación: cualquier persona con acceso a la URL puede operar los incidentes | Aceptado para v1.0.0 (uso en red interna); candidato a una versión futura |
| Sin cabeceras de seguridad HTTP (por ejemplo, `helmet`) ni límite de peticiones | Candidato a deuda técnica |
