# Base de datos

ArrowOps usa **PostgreSQL 17** en Docker.

| Archivo | Contenido |
|---|---|
| `docker-compose.yml` | Servicio `db` (`postgres:17-alpine`) en el puerto **5433** del host, con un volumen persistente y health check |
| `schema.sql` | Tabla `incidents` con restricciones e índices; es idempotente |
| `seed.sql` | Datos de ejemplo para desarrollo |

## Uso local

1. Crea `.env` en la raíz (está ignorado por git) a partir de `.env.example` y define una contraseña en `POSTGRES_PASSWORD`. Ajusta la misma contraseña en `DATABASE_URL`.
2. Levanta la base de datos:

   ```bash
   docker compose --env-file .env -f database/docker-compose.yml up -d --wait
   ```

3. Arranca la app con `DATABASE_URL` definida. Sin esa variable, la app usa el repositorio en memoria.

`schema.sql` y `seed.sql` solo se ejecutan la primera vez que se crea el volumen. Para empezar de cero: `docker compose ... down -v`.
