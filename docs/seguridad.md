# Seguridad

## Política de secretos

**Ninguna credencial, token o clave se guarda en el repositorio.**

| Secreto | Dónde vive | Cómo se usa |
|---|---|---|
| PAT de Azure DevOps (uso local con `az`) | Almacén de credenciales de Windows (`az devops login`) o variable de entorno de la sesión (`AZURE_DEVOPS_EXT_PAT`) | Nunca en archivos del repo ni en scripts |
| Token del agente autohospedado | El PAT se ingresó solo de forma interactiva en `config.cmd`. El agente guarda sus propias credenciales cifradas en `C:\agents\arrowops`, fuera del repo | Implementado |
| `POSTGRES_PASSWORD` (CI en Azure) | **Variable secreta** del pipeline `ArrowOps-CI`. No es heredable por la ejecución (`allow-override false`) | Se mapea con `env:` solo en los pasos de Docker y de pruebas; Azure la enmascara (`***`) en los logs. Implementado |
| `POSTGRES_PASSWORD` (CI en GitHub) | **Secret** del repositorio (Actions) y **Secret de Dependabot**, con el mismo valor, para que los PR de Dependabot también puedan ejecutar las pruebas | Se inyecta en el servicio `postgres` y en `DATABASE_URL`; GitHub lo enmascara en los logs. Implementado |
| `POSTGRES_PASSWORD` (ambiente `dev`) | La misma variable secreta del pipeline que usa el CI | Se inyecta con `env:` al desplegar `arrowops-dev`. Implementado |
| `POSTGRES_PASSWORD_PROD` (ambiente `prod`) | **Variable secreta propia** del pipeline, distinta de la de CI y dev | Solo la usa la etapa `Deploy_prod`, que requiere aprobación manual. Implementado |
| `POSTGRES_PASSWORD` y `DATABASE_URL` (desarrollo) | Archivo `.env` local, ignorado por git y generado con una contraseña aleatoria | `docker compose --env-file .env`. Implementado |

### Configuración por variables de entorno

La app lee su configuración de variables de entorno en `backend/src/config.js`. No hay valores de configuración fijos en el código:

| Variable | Valor por defecto | Validación |
|---|---|---|
| `PORT` | 3000 | Entero entre 1 y 65535; si no es válido, la app no arranca |
| `NODE_ENV` | `development` | `development`, `test` o `production` |
| `DATABASE_URL` | — (sin ella se usa el repositorio en memoria) | Debe empezar con `postgres://`. El mensaje de error **no muestra el valor**, porque contiene la contraseña |

- `.env.example` documenta las variables **sin valores reales** y es el único archivo `.env*` que se versiona.
- Los valores reales se definen en el entorno: el sistema operativo, las variables o Variable Group de Azure Pipelines (las sensibles, marcadas como secretas) o los Secrets de GitHub Actions.
- Los secretos de la base de datos siguen este patrón: variable de entorno en `config.js`, entrada **sin valor** en `.env.example` y valor real solo en `.env` local o en un almacén de secretos. Cada ambiente usa una contraseña distinta: desarrollo y CI no comparten credenciales.
- `database/docker-compose.yml` exige `POSTGRES_PASSWORD` (`${POSTGRES_PASSWORD:?...}`): sin ella, el contenedor no arranca, en vez de usar una contraseña por defecto.

Controles preventivos:

- `.gitignore` excluye `.env`, `.env.*` (menos `.env.example`) y `*.pat`.
- Los scripts de `devops/scripts/` leen el PAT del entorno; no lo reciben como parámetro ni lo escriben en disco.
- El checklist del PR incluye: "No hay credenciales, tokens ni claves en el código".
- **Secret scanning** y **push protection** de GitHub activos (Settings → Code security). Un `git push` que contenga un token conocido (de GitHub, Azure, etc.) se rechaza antes de llegar al repo.
- **gitleaks en GitHub Actions** (job `Escaneo de secretos`): revisa **todo el historial** de commits en cada PR y en cada push a `main`. Detecta patrones de credenciales que el secret scanning de GitHub no cubre.
- **Dependabot alerts** y **Dependency graph** activos desde el 2026-10-29 (ver [fallos-pipeline.md](fallos-pipeline.md), F-03).

## Incidentes de seguridad

| Fecha | Incidente | Respuesta | Lección |
|---|---|---|---|
| 2026-10-28 | El PAT de Azure DevOps se expuso en texto plano fuera de la terminal (pegado en un chat) | Se **regeneró** de inmediato desde *User settings → Personal access tokens*, lo que invalidó el valor expuesto. El token nuevo se guardó con `az devops login` | Los tokens solo se introducen en la terminal o en un almacén de secretos, nunca en mensajes ni documentos. Se adoptó `az devops login` para no manejar el token a mano |

## Controles en la aplicación

| Riesgo | Control | Ubicación |
|---|---|---|
| Datos inválidos o maliciosos en la API | Validación de tipos, campos obligatorios, longitud máxima y valores permitidos (enum) | `backend/src/models/incident.js` |
| JSON mal formado | Responde 400 sin exponer detalles internos | `backend/src/app.js` |
| Fuga de información en errores | Los errores 500 responden un mensaje genérico; el detalle solo va al log del servidor. Lo verifica una prueba automatizada | `backend/src/app.js`, `tests/api/errors.test.js` |
| Configuración inválida | `PORT`, `NODE_ENV` y `DATABASE_URL` se validan al arrancar; la app no inicia con valores inválidos | `backend/src/config.js` |
| Inyección SQL | Todas las consultas usan parámetros (`$1`, `$2`...); nunca se concatenan valores en el SQL | `backend/src/repositories/postgresIncidentRepository.js` |
| Datos inválidos en la base de datos | Restricciones `CHECK`, `NOT NULL` y longitudes máximas en el esquema, como última línea de defensa. Lo verifica una prueba de integración | `database/schema.sql`, `tests/contract/postgres.test.js` |
| XSS al renderizar datos del usuario | `escapeHtml()` antes de insertar texto con `innerHTML` | `frontend/src/app.js` |
| Inyección en URLs | `encodeURIComponent()` en los IDs de las rutas | `frontend/src/api.js` |
| Filtros arbitrarios | `status` y `priority` se validan contra listas permitidas | `backend/src/routes/incidents.js` |

## Controles en el despliegue

| Riesgo | Control |
|---|---|
| Desplegar algo distinto a lo probado | La imagen se construye desde el `.tgz` del CI, no desde el código |
| Contenedor con privilegios | La app corre como usuario `node`, no como root |
| Base de datos expuesta | El contenedor `db` de cada ambiente no publica puertos; solo la app lo alcanza por la red interna de Compose |
| Despliegue no autorizado a producción | `Deploy_prod` solo corre con tags `v*` y requiere aprobación manual en el Environment `arrowops-prod` |
| Despliegue defectuoso | Health check posterior con verificación de versión; si falla, la etapa falla |

## Controles en el proceso

- `main` protegida: todo cambio pasa por un PR revisado.
- Análisis de dependencias con `npm audit` (ver [dependencias.md](dependencias.md)). *Planificado (Fase 2):* que falle el pipeline si hay vulnerabilidades altas o críticas, y Dependabot.
- PAT con permisos mínimos: solo Work Items, Code, Build y Agent Pools, y con vencimiento.

## Riesgos conocidos

| Riesgo | Estado |
|---|---|
| Sin autenticación: cualquier persona con acceso a la URL puede operar los incidentes | Aceptado para v1.0.0 (uso en red interna); candidato a una versión futura |
| Sin cabeceras de seguridad HTTP (por ejemplo, `helmet`) ni límite de peticiones | Candidato a deuda técnica |
