# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versiones según [Semantic Versioning](https://semver.org/lang/es/).

## [1.0.0] - 2026-10-29

Primera versión estable.

### Agregado
- Persistencia en **PostgreSQL 17** con Docker (`database/`): esquema con restricciones, datos de ejemplo y módulo de datos con consultas parametrizadas (TD-01, PR #15).
- Pruebas de contrato que se ejecutan contra los módulos de datos en memoria y PostgreSQL; integración con PostgreSQL en GitHub Actions y Azure Pipelines.
- Ambientes **`dev`** (http://localhost:8081) y **`prod`** (http://localhost:8080) en Docker, desplegados por Azure Pipelines desde el artefacto del CI, con **aprobación manual** antes de `prod` (PR #17).
- `GET /health` informa la versión desplegada; el pipeline la verifica después de cada despliegue.

### Cambiado
- Los finales de línea los define el repo con `.gitattributes` (TD-02, PR #16).
- `POSTGRES_PASSWORD` y `POSTGRES_PASSWORD_PROD` como secretos del pipeline y de GitHub.

## [0.4.0] - 2026-10-29

### Agregado
- Configuración por variables de entorno con validación (`PORT`, `NODE_ENV`) y `.env.example`.
- Escaneo de secretos con gitleaks sobre todo el historial; umbral de cobertura en CI (100% de líneas).

### Cambiado
- Express 4 → **5**, jest 29 → 30 y actions de GitHub actualizadas (PR de Dependabot #9 a #13).

## [0.3.0] - 2026-10-29

### Agregado
- Pipeline `ArrowOps-CI` en Azure Pipelines con agente autohospedado: build, pruebas con cobertura, `npm audit`, `npm pack` y artefacto.
- Workflow de GitHub Actions (pruebas en Node 20 y 22, `dependency-review`) y Dependabot.

### Corregido
- `jest-junit` 16 → 17 por la vulnerabilidad moderada de `uuid` (F-01).
- Fallo controlado F-02 (límite del título) detectado por el CI y corregido.

## [0.2.0] - 2026-10-28

### Agregado
- CRUD completo de la API: `GET`, `PUT` y `DELETE` con filtros por estado y prioridad.
- Interfaz web: tabla con filtro por estado y formulario de alta, edición y eliminación.

## [0.1.0] - 2026-10-28

### Agregado
- API para registrar incidentes (`POST /api/incidents`) con validaciones y `GET /health`.

[1.0.0]: https://github.com/EmilioAlonzo4587/arrowops/compare/v0.4.0...v1.0.0
[0.4.0]: https://github.com/EmilioAlonzo4587/arrowops/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/EmilioAlonzo4587/arrowops/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/EmilioAlonzo4587/arrowops/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/EmilioAlonzo4587/arrowops/releases/tag/v0.1.0
