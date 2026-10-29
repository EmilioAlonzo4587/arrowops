# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versiones según [Semantic Versioning](https://semver.org/lang/es/).

## [2.0.1] - 2026-10-29

### Corregido
- **Despliegue (F-04, Bug AB#56):** el despliegue del tag `v2.0.0` tomó un artefacto obsoleto del workspace del agente autohospedado. Ahora el workspace se limpia en cada despliegue, la versión del artefacto se verifica (un único `.tgz`, igual a la del tag) y las imágenes se etiquetan `<versión>-<build>` de forma inmutable (PR #23).

Es la primera versión 2.x desplegada en producción. Incluye todo el alcance funcional de 2.0.0.

## [2.0.0] - 2026-10-29

> **No desplegada a producción:** la aprobación de `prod` se rechazó al detectar el fallo F-04. Ver 2.0.1.

Alcance funcional completo: operación, seguimiento, consulta e indicadores.

### ⚠️ Cambios incompatibles
- **Estados nuevos:** `NUEVO`, `ASIGNADO`, `EN_PROCESO`, `RESUELTO` y `CERRADO` reemplazan a `abierto`, `en_progreso`, `resuelto` y `cerrado`. Los valores de v1 responden 400.
- **`category` es obligatoria** en `POST` y `PUT` (`hardware`, `software`, `red`, `accesos`, `otro`).
- **El estado ya no se fija al crear ni con `PUT`:** todo incidente nace `NUEVO` y cambia solo con `PATCH /status` y `PATCH /assign`, respetando el flujo.

### Guía de migración desde v1.x
- **Datos:** no requieren acción. Al arrancar, la app aplica las migraciones `002` y `003`. Convierten `abierto` → `NUEVO`, `en_progreso` → `EN_PROCESO`, `resuelto` → `RESUELTO` y `cerrado` → `CERRADO`; asignan la categoría `otro` y crean el evento `creado` en la bitácora de cada incidente. Ningún incidente se pierde.
- **Clientes de la API:** enviar `category`; usar los estados nuevos en los filtros; reemplazar el cambio de estado por `PUT` por `PATCH /api/incidents/:id/status`, y la asignación por `PATCH /api/incidents/:id/assign`.

### Agregado
- Categoría del incidente y catálogo de técnicos (`GET /api/technicians`).
- Asignación y reasignación de técnico; cambio de estado con transiciones válidas (409 si se intenta un salto inválido) (PR #20).
- Bitácora: eventos automáticos (creado, editado, asignado, cambio de estado) y comentarios, con historial visible por incidente (PR #21).
- Filtros por estado, prioridad, categoría y técnico, en la API y en la interfaz.
- Dashboard (`GET /api/stats`): abiertos, cerrados, críticos y distribución por categoría y técnico.
- `GET /api/meta`: catálogos y flujo de estados para la interfaz.
- Migraciones versionadas de base de datos, aplicadas al arrancar (`database/migrations/`).
- `docker-compose.yml` en la raíz para levantar todo el proyecto con un comando (PR #19).
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

[2.0.1]: https://github.com/EmilioAlonzo4587/arrowops/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/EmilioAlonzo4587/arrowops/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/EmilioAlonzo4587/arrowops/compare/v0.4.0...v1.0.0
[0.4.0]: https://github.com/EmilioAlonzo4587/arrowops/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/EmilioAlonzo4587/arrowops/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/EmilioAlonzo4587/arrowops/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/EmilioAlonzo4587/arrowops/releases/tag/v0.1.0
