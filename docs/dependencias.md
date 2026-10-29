# Análisis de dependencias

## Inventario

Las versiones están fijadas exactamente en `package.json` (`--save-exact`). `package-lock.json` está versionado para que las instalaciones sean reproducibles con `npm ci`.

| Paquete | Versión | Tipo | Uso |
|---|---|---|---|
| `express` | 5.3.0 | producción | Servidor HTTP y API |
| `pg` | 8.23.1 | producción | Driver de PostgreSQL (node-postgres); se agregó al resolver TD-01. `npm audit --omit=dev`: 0 vulnerabilidades |
| `jest` | 30.5.2 | desarrollo | Ejecución de pruebas |
| `jest-junit` | 17.0.0 | desarrollo | Reporte JUnit de pruebas para Azure Pipelines |
| `supertest` | 7.3.1 | desarrollo | Pruebas HTTP de la API |

**Recursos de terceros fuera de npm**

| Recurso | Versión | Licencia | Uso y decisión |
|---|---|---|---|
| IBM Plex Sans (400, 500, 600) e IBM Plex Mono (400, 500), subconjunto latino `.woff2` | `@fontsource` 5.1.0 | SIL OFL 1.1 ([frontend/fonts/OFL.txt](../frontend/fonts/OFL.txt)) | Tipografía de la interfaz (AB#58). Se versionan en `frontend/fonts/` en lugar de cargarlas desde Google Fonts o un CDN: la app funciona sin internet, no envía datos de los usuarios a terceros y no agrega un paquete npm. Son archivos estáticos sin código ejecutable, así que `npm audit` no aplica; se actualizan a mano. |

## Herramientas

| Herramienta | Cuándo | Estado |
|---|---|---|
| `npm audit` | Manual, en cada cambio de dependencias | Implementado |
| `npm audit --omit=dev --audit-level=high` en Azure Pipelines | En cada ejecución; **bloquea** el build si hay vulnerabilidades altas o críticas en producción | Implementado |
| `npm audit` completo en Azure Pipelines | En cada ejecución; informativo, registra una advertencia | Implementado |
| `actions/dependency-review-action` en GitHub Actions | En cada PR; **falla** si el PR agrega dependencias con vulnerabilidades moderadas o más graves | Implementado |
| `npm audit --omit=dev --audit-level=high` en GitHub Actions | En cada PR y push a `main`, con Node 20 y 22 | Implementado |
| Dependabot | PR semanales (los lunes) para npm y GitHub Actions, con la etiqueta `dependencias` | Implementado |

## Resultados

### 2026-10-28: `npm audit` (v0.2.0)

| Alcance | Críticas | Altas | Moderadas | Bajas |
|---|---|---|---|---|
| Producción (`--omit=dev`) | 0 | 0 | 0 | 0 |
| Desarrollo | 0 | 0 | 0 | 6 |

**Detalle de las 6 de severidad baja**: se originan en una sola vulnerabilidad.

| Advisory | Paquete | Severidad | Descripción | Cadena |
|---|---|---|---|---|
| [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) | `deepmerge` ≥ 4.2.0 | Baja | `mergeObject()` permite *prototype poisoning* de los objetos devueltos | `jest` → `@jest/core` → `jest-config` → `deepmerge` (también llega por `jest-cli` y `create-jest`) |

**Decisión: aceptar el riesgo y volver a evaluarlo.**

- `deepmerge` solo lo usa Jest para combinar su configuración de pruebas, que está en el repo. No procesa datos externos.
- Es una dependencia de desarrollo: no se instala en producción ni se incluye en el artefacto.
- La corrección que propone npm (`npm audit fix --force`) bajaría `jest` a la 25.1.0. Es un cambio incompatible a una versión más antigua y sin soporte, y su riesgo es mayor que el que corrige.
- Se revisará cuando Jest publique una versión con `deepmerge` corregido; Dependabot avisará. Queda registrada como deuda TD-07.

### 2026-10-29: pipeline del PR #6 (agregado `jest-junit`)

| Alcance | Críticas | Altas | Moderadas | Bajas |
|---|---|---|---|---|
| Producción | 0 | 0 | 0 | 0 |
| Desarrollo | 0 | 0 | **2** | 6 |

| Advisory | Paquete | Severidad | Descripción | Cadena |
|---|---|---|---|---|
| [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | `uuid` < 11.1.1 (instalado 8.3.2) | Moderada | Falta comprobar los límites del buffer en v3/v5/v6 cuando se pasa `buf` | `jest-junit@16.0.0` → `uuid` |

**Decisión: corregir.** Hay una versión compatible para el uso que le damos: `jest-junit` 17.0.0, que trae `uuid` 14.0.3. El cambio de versión mayor solo afecta al reporter de pruebas; se comprobó que el reporte JUnit y las 22 pruebas siguen funcionando. Tras la corrección: producción 0, desarrollo 6 bajas (las ya aceptadas). Detectado por el pipeline; ver [fallos-pipeline.md](fallos-pipeline.md), F-01.

### 2026-10-29: primeras actualizaciones de Dependabot (PR #9 a #13)

| PR | Actualización | Tipo | Decisión | Validación |
|---|---|---|---|---|
| [#9](https://github.com/EmilioAlonzo4587/arrowops/pull/9) | `actions/dependency-review-action` 4 → 5 | GitHub Actions | Integrar | 4 checks en verde |
| [#10](https://github.com/EmilioAlonzo4587/arrowops/pull/10) | `actions/setup-node` 4 → 7 | GitHub Actions | Integrar | 4 checks en verde |
| [#11](https://github.com/EmilioAlonzo4587/arrowops/pull/11) | `actions/checkout` 4 → 7 | GitHub Actions | Integrar | 4 checks en verde |
| [#12](https://github.com/EmilioAlonzo4587/arrowops/pull/12) | `jest` 29.7.0 → 30.5.2 | desarrollo, mayor | Integrar | 23 pruebas en una copia aislada; las vulnerabilidades bajas pasan de 6 a 5 |
| [#13](https://github.com/EmilioAlonzo4587/arrowops/pull/13) | `express` 4.22.3 → **5.3.0** | **producción, mayor** | Integrar (ver abajo) | 23 pruebas, prueba de humo del servidor real y 4 checks en verde |

**Decisión sobre Express 5.** Es una versión mayor de la dependencia principal, con cambios incompatibles: sintaxis de rutas de `path-to-regexp` v8, manejo de promesas rechazadas en los handlers y algunas APIs eliminadas. Se analizó el impacto:

- Las rutas de ArrowOps son simples (`/`, `/:id`, `/health`) y no usan comodines ni expresiones regulares.
- El manejo de JSON mal formado sigue respondiendo 400 (`entity.parse.failed`), y los archivos estáticos responden 200.
- No usa APIs eliminadas en Express 5.
- Express 5 es la línea con soporte activo; conviene llegar a v1.0.0 sobre ella y no sobre Express 4.

**Incidente del lockfile (PR #13).** Después de integrar jest 30 (#12), Dependabot rebasó el #13 y dejó `package-lock.json` desincronizado (`Missing: detect-libc@2.1.2 from lock file`). `npm ci` se negó a instalar en los 3 jobs de pruebas. Se regeneró con `@dependabot recreate` y los 4 checks quedaron en verde. Esto confirma el valor de usar `npm ci` en el CI: falla en lugar de instalar algo distinto a lo fijado.

### 2026-10-29: `npm audit` (v0.4.0)

| Alcance | Críticas | Altas | Moderadas | Bajas |
|---|---|---|---|---|
| Producción (`--omit=dev`) | 0 | 0 | 0 | 0 |
| Desarrollo | 0 | 0 | 0 | 5 |

Las 5 bajas siguen viniendo de `deepmerge` ([GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)) a través de jest 30. Se mantiene la decisión de aceptar el riesgo (deuda TD-07).

## Criterio de decisión

| Severidad | Producción | Desarrollo |
|---|---|---|
| Crítica / Alta | Se corrige antes del merge; el pipeline falla | Se corrige o se justifica por escrito |
| Moderada | Se corrige en el sprint | Se evalúa caso por caso |
| Baja | Se evalúa caso por caso | Se acepta si no hay una corrección compatible; se documenta |
