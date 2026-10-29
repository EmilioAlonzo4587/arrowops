# Base de datos

ArrowOps usa **PostgreSQL 17** en Docker.

| Archivo | Contenido |
|---|---|
| `migrations/001_incidents.sql` | Esquema inicial de v1.0.0: tabla `incidents` |
| `migrations/002_categoria_tecnicos_estados.sql` | v2.0.0: catálogo `technicians`, columnas `category` y `technician_id`, y conversión de los estados v1 a `NUEVO`, `ASIGNADO`, `EN_PROCESO`, `RESUELTO` y `CERRADO` |
| `migrations/003_bitacora.sql` | v2.0.0: tabla `incident_events` (bitácora) con el evento `creado` de los incidentes existentes |
| `seed.sql` | Datos de ejemplo. La app los carga solo si `SEED_DEMO_DATA=true` y la tabla está vacía |
| `docker-compose.yml` | PostgreSQL para desarrollo local, en el puerto **5433** del host |

## Migraciones

La app aplica las migraciones pendientes **al arrancar** (`backend/src/db/migrate.js`) y las registra en la tabla `schema_migrations`. No hace falta ejecutar SQL a mano en ningún ambiente.

Para cambiar el esquema, agrega un archivo nuevo con el siguiente número (por ejemplo, `003_...sql`). **Nunca edites una migración ya publicada**: en los ambientes donde ya se aplicó no se volvería a ejecutar.

## Uso local

1. Crea `.env` a partir de `.env.example` y define `POSTGRES_PASSWORD` y `DATABASE_URL`.
2. Levanta la base de datos:

   ```bash
   docker compose --env-file .env -f database/docker-compose.yml up -d --wait
   ```

3. Arranca la app con `node --env-file=.env backend/src/server.js`. Para cargar los datos de ejemplo, agrega `SEED_DEMO_DATA=true` en `.env`.

Las pruebas de integración (`tests/contract/postgres.test.js`) **borran el esquema completo**. Ejecútalas contra una base desechable, como hace el CI (proyecto `arrowops-ci` en el puerto 5434), nunca contra la base de desarrollo.
