# Estrategia de release

## Versionado semántico

Se sigue [Semantic Versioning 2.0.0](https://semver.org/lang/es/): `MAJOR.MINOR.PATCH`.

| Parte | Se incrementa cuando |
|---|---|
| `MAJOR` | Hay cambios incompatibles en la API. `1.0.0` marca la primera versión estable |
| `MINOR` | Hay funcionalidad nueva compatible |
| `PATCH` | Hay correcciones compatibles |

Mientras la versión sea `0.y.z`, la API se considera en desarrollo.

La versión vive en `package.json` y se marca con un **tag anotado** `vX.Y.Z` sobre el commit de `main` que corresponde.

## Secuencia de versiones

| Versión | Contenido | Commit / PR | Estado |
|---|---|---|---|
| v0.1.0 | API: registrar incidentes (`POST /api/incidents`) | PR #1 | Publicada (tag) |
| v0.2.0 | CRUD completo e interfaz web | PR #2 a #4 | Publicada (tag) |
| v0.3.0 | Integración continua: Azure Pipelines en el agente autohospedado, artefacto, GitHub Actions y Dependabot | PR #6 a #8 | Publicada (tag) |
| v0.4.0 | Calidad y seguridad: Express 5 y jest 30 (Dependabot), configuración por variables de entorno, 100% de cobertura de líneas con umbral en CI, escaneo de secretos con gitleaks | PR #9 a #14 | Publicada (tag) |
| v1.0.0 | **Primera versión estable:** persistencia en PostgreSQL (TD-01), finales de línea normalizados (TD-02), ambientes `dev` y `prod` en Docker con aprobación manual y GitHub Release | PR #15 a #17 | **Publicada** (tag + GitHub Release, desplegada en `prod`) |

## Artefacto

**Implementado.** El pipeline `ArrowOps-CI` genera un único artefacto versionado con `npm pack`, `arrowops-<version>.tgz`. Solo contiene lo que se ejecuta en producción, según el campo `files` de `package.json`: `backend/src`, `frontend/`, `README.md` y `package.json` (12 archivos, sin pruebas ni dependencias de desarrollo). Se publica como el artefacto de pipeline `arrowops`. En las versiones etiquetadas se publica también como **GitHub Release**, con el `.tgz` adjunto.

Para desplegarlo, el pipeline construye una **imagen Docker a partir del mismo `.tgz`** (`devops/deploy/Dockerfile`): se despliega exactamente lo que pasó las pruebas, sin volver a compilar desde el código. La imagen usa `node:22-alpine`, instala solo las dependencias de producción, corre como usuario `node` (no root) e incluye un `HEALTHCHECK`.

Para evaluar el proyecto completo sin pipeline, el `docker-compose.yml` de la raíz construye la imagen desde el código con el **mismo empaquetado** (`npm pack` → instalar solo dependencias de producción) y levanta PostgreSQL (ver `README.md`).

Para instalarlo en un servidor:

```bash
npm install --omit=dev ./arrowops-<version>.tgz
node node_modules/arrowops/backend/src/server.js
```

## Ambientes y controles

**Implementado** en `azure-pipelines.yml`, con la plantilla `devops/deploy/deploy-steps.yml` (los dos ambientes se despliegan con los mismos pasos).

```mermaid
flowchart LR
    PR[Pull Request] -->|5 checks obligatorios| M[merge a main]
    M --> CI[Etapa CI<br>build, pruebas, audit, artefacto]
    T[tag vX.Y.Z] --> CI
    CI -->|automático| DEV[Deploy_dev<br>arrowops-dev :8081]
    DEV -->|solo tags| G{Aprobación manual<br>Environment arrowops-prod}
    G -->|aprobado| PROD[Deploy_prod<br>arrowops-prod :8080]
    DEV -. health check + versión .-> DEV
    PROD -. health check + versión .-> PROD
```

| Ambiente | Environment de Azure | URL | Disparador | Controles |
|---|---|---|---|---|
| `dev` | `arrowops-dev` | http://localhost:8081 | Cada merge a `main` y cada tag `v*` (nunca en PR) | Etapa CI en verde: build, 55 pruebas con umbral de cobertura, `npm audit` sin vulnerabilidades altas en producción. Health check posterior al despliegue |
| `prod` | `arrowops-prod` | http://localhost:8080 | Solo tags `vX.Y.Z` | Despliegue en `dev` exitoso, **aprobación manual** (*Approvals and checks* del Environment), health check y **verificación de que la versión desplegada es la del tag** |

**Cómo es cada ambiente:** un proyecto de Docker Compose (`devops/deploy/docker-compose.yml`) en el agente autohospedado, con dos contenedores:

- `app`: la imagen `arrowops:<versión>`, publicada en el puerto del ambiente.
- `db`: PostgreSQL 17 con **volumen persistente propio**. Los datos sobreviven a los despliegues y cada ambiente tiene sus propios datos. La base de datos **no publica puertos**: solo la app puede alcanzarla.

**Secretos por ambiente:** `dev` usa la variable secreta `POSTGRES_PASSWORD` y `prod` usa **otra distinta**, `POSTGRES_PASSWORD_PROD`. Las dos son variables secretas del pipeline y nunca se guardan en el repo.

**Validación posterior al despliegue:** se consulta `GET /health` del ambiente (hasta 10 intentos) y se exige `status: ok` y `version` igual a la del artefacto. Si el ambiente sigue con la versión anterior, el despliegue falla.

## Rollback

Para volver atrás se despliega de nuevo una versión anterior, sin reconstruir nada:

1. **Desde Azure Pipelines (recomendado):** en *Pipelines → ArrowOps-CI*, abrir la ejecución del tag de la versión estable anterior y pulsar **Rerun** en la etapa `Deploy_prod`. Aplica desde v1.0.0: las versiones 0.x no tenían etapas de despliegue. Se vuelve a desplegar el artefacto de esa ejecución y pasa por la misma aprobación.
2. **Manual en el agente,** si la imagen anterior sigue en Docker:
   ```bash
   APP_VERSION=<version-anterior> APP_PORT=8080 POSTGRES_PASSWORD=<secreto> \
     docker compose -p arrowops-prod -f devops/deploy/docker-compose.yml up -d --wait
   ```

El volumen de datos no se toca en un rollback. Los cambios de esquema son aditivos (`CREATE ... IF NOT EXISTS`), así que una versión anterior sigue siendo compatible con la base de datos.
## Checklist de release v1.0.0

- [x] Todos los PR del alcance integrados en `main` con CI en verde: PR #15 (TD-01), #16 (TD-02) y #17 (release), con los 5 checks obligatorios.
- [x] `package.json` con la versión nueva: `1.0.0` (PR #17).
- [x] Tag anotado `v1.0.0` creado y publicado sobre `47f1550` (merge del PR #17).
- [x] Artefacto generado y publicado: `arrowops-1.0.0.tgz`, artefacto de pipeline `arrowops` de la ejecución 46 y adjunto al [GitHub Release v1.0.0](https://github.com/EmilioAlonzo4587/arrowops/releases/tag/v1.0.0) con su SHA-256.
- [x] Despliegue en `dev` validado: ejecución [#20261029.36](https://dev.azure.com/devopsArrow/ArrowOps/_build/results?buildId=45) (merge a `main`) y de nuevo en [#20261029.37](https://dev.azure.com/devopsArrow/ArrowOps/_build/results?buildId=46) (tag). Health check: `{"status":"ok","version":"1.0.0"}` en http://localhost:8081.
- [x] Aprobación de `prod` registrada: en la ejecución #20261029.37, la etapa `Desplegar en prod` esperó la autorización del Environment y la **aprobación manual** (`Checkpoint.Approval: succeeded`) antes de desplegar. Health check: `Health check OK: http://localhost:8080/health -> version 1.0.0`.
- [x] Work Items del alcance en `Closed`: AB#29, AB#31, la Feature AB#25 y la Epic AB#17. Quedan en el backlog, a propósito, las deudas TD-03 a TD-07 (AB#35 a AB#39) para versiones posteriores.

### Evidencia del flujo de release v1.0.0

| Paso | Ejecución | Resultado |
|---|---|---|
| PR #17 (solo CI) | #20261029.35 (build 44) | CI ✅, `Deploy_dev` y `Deploy_prod` **omitidos** (nunca se despliega desde un PR) |
| Merge a `main` | #20261029.36 (build 45) | CI ✅ → autorización del Environment `arrowops-dev` → `Deploy_dev` ✅; `Deploy_prod` omitido (no es tag) |
| Tag `v1.0.0` | #20261029.37 (build 46) | CI ✅ → `Deploy_dev` ✅ → **en espera** (autorización y aprobación de `arrowops-prod`) → aprobado → `Deploy_prod` ✅ |

Estado final de los ambientes (contenedores en el agente `PC-EMILIO`):

| Contenedor | Estado | Puertos |
|---|---|---|
| `arrowops-prod-app-1` | healthy | `8080 → 3000` |
| `arrowops-prod-db-1` | healthy | solo interno (`5432/tcp`) |
| `arrowops-dev-app-1` | healthy | `8081 → 3000` |
| `arrowops-dev-db-1` | healthy | solo interno (`5432/tcp`) |