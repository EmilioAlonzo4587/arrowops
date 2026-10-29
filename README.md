# ArrowOps

ArrowOps es una solución web para registrar, dar seguimiento y cerrar incidentes de TI. El proyecto demuestra un proceso DevOps verificable, desde la necesidad del negocio hasta la versión `v1.0.0`.

## Estructura

| Carpeta | Contenido |
|---|---|
| `backend/` | API REST (Node.js + Express) con el CRUD de incidentes |
| `frontend/` | Interfaz web |
| `database/` | Esquema y datos iniciales |
| `tests/` | Pruebas automatizadas |
| `devops/` | Scripts de Azure Boards, agente autohospedado y utilidades DevOps |
| `docs/` | Documentación, decisiones, dependencias y registro de deuda técnica |
| `.github/workflows/` | GitHub Actions |
| `azure-pipelines.yml` | Pipeline de CI/CD en Azure Pipelines |

## Levantar todo el proyecto con Docker (recomendado)

Requisitos: [Docker Desktop](https://www.docker.com/products/docker-desktop/) (o Docker Engine con Compose v2) y Git.

```bash
git clone https://github.com/EmilioAlonzo4587/arrowops.git
cd arrowops
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
```

Edita `.env` y escribe cualquier contraseña en `POSTGRES_PASSWORD` (por ejemplo, `POSTGRES_PASSWORD=mi-clave`). Después:

```bash
docker compose up -d --build
```

Abre **http://localhost:3000**. Se levantan dos contenedores:

| Servicio | Qué es |
|---|---|
| `app` | ArrowOps: API y frontend, construidos desde el código |
| `db` | PostgreSQL 17 con el esquema y 4 incidentes de ejemplo |

| Acción | Comando |
|---|---|
| Ver el estado | `docker compose ps` |
| Ver los logs | `docker compose logs -f app` |
| Detener | `docker compose down` |
| Detener y borrar los datos | `docker compose down -v` |
| Usar otro puerto | `APP_PORT=8090` en `.env` |

La contraseña no está en el repositorio: se lee de `.env`, que git ignora. Si falta, Docker lo avisa con un mensaje claro.

## Ejecutar en local

Requisitos: Node.js 20 o superior.

```bash
npm install
npm start        # http://localhost:3000
npm test
```

Configuración por variables de entorno (ver `.env.example`): `PORT` (3000 por defecto), `NODE_ENV` (`development`, `test` o `production`) y `DATABASE_URL`.

### Con PostgreSQL (Docker)

```bash
cp .env.example .env     # definir POSTGRES_PASSWORD y DATABASE_URL
docker compose --env-file .env -f database/docker-compose.yml up -d --wait
DATABASE_URL=postgres://arrowops:<password>@localhost:5433/arrowops npm start
```

Sin `DATABASE_URL`, la app usa un repositorio en memoria. Ver [database/README.md](database/README.md).

## API

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Estado y versión del servicio |
| `GET` | `/api/incidents?status=&priority=&category=&technicianId=` | Lista de incidentes, con filtros opcionales |
| `GET` | `/api/incidents/:id` | Detalle de un incidente |
| `POST` | `/api/incidents` | Crea un incidente (estado `NUEVO`) |
| `PUT` | `/api/incidents/:id` | Edita los datos de un incidente |
| `PATCH` | `/api/incidents/:id/assign` | Asigna un técnico (`NUEVO` pasa a `ASIGNADO`) |
| `PATCH` | `/api/incidents/:id/status` | Cambia el estado según el flujo |
| `DELETE` | `/api/incidents/:id` | Elimina un incidente |
| `GET` | `/api/incidents/:id/history` | Bitácora del incidente |
| `POST` | `/api/incidents/:id/comments` | Agrega un comentario |
| `GET` | `/api/stats` | Indicadores del dashboard |
| `GET` | `/api/technicians` | Catálogo de técnicos |
| `GET` | `/api/meta` | Estados, prioridades, categorías y transiciones |

Campos: `title`, `description`, `category` (`hardware`, `software`, `red`, `accesos`, `otro`) y `priority` (`baja`, `media`, `alta`, `critica`) son obligatorios; `reporter` es opcional. Flujo de estados: `NUEVO` → `ASIGNADO` → `EN_PROCESO` → `RESUELTO` → `CERRADO` (ver [docs/arquitectura.md](docs/arquitectura.md)).

## Flujo de trabajo

- Rama principal: `main` (protegida, solo entra código por Pull Request).
- Ramas de trabajo: `feature/<id>-<descripcion>`, `fix/<id>-<descripcion>`.
- Cada commit referencia su Work Item de Azure Boards: `git commit -m "feat: crear incidente AB#123"`.
- Revisión de PR: proyecto individual, por lo que se aplica **auto-revisión** documentada. Cada PR usa la plantilla `.github/pull_request_template.md` (checklist de revisión y evidencia de validación), incluye comentarios de revisión en el diff y solo se integra con los checks de CI en verde.
- Versionado semántico (`MAJOR.MINOR.PATCH`) hasta `v1.0.0`.

## Fases

1. **Planificación y desarrollo base:** backlog, CRUD y primeros PR.
2. **CI, calidad y seguridad:** pipelines, pruebas, secretos, análisis de dependencias, agente autohospedado, fallo controlado.
3. **Estabilización y release:** deuda técnica, versionado y empaquetado del artefacto.
