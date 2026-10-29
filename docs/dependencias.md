# Análisis de dependencias

## Inventario

Las versiones están fijadas exactamente en `package.json` (`--save-exact`). `package-lock.json` está versionado para que las instalaciones sean reproducibles con `npm ci`.

| Paquete | Versión | Tipo | Uso |
|---|---|---|---|
| `express` | 4.22.3 | producción | Servidor HTTP y API |
| `jest` | 29.7.0 | desarrollo | Ejecución de pruebas |
| `jest-junit` | 17.0.0 | desarrollo | Reporte JUnit de pruebas para Azure Pipelines |
| `supertest` | 7.3.1 | desarrollo | Pruebas HTTP de la API |

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

## Criterio de decisión

| Severidad | Producción | Desarrollo |
|---|---|---|
| Crítica / Alta | Se corrige antes del merge; el pipeline falla | Se corrige o se justifica por escrito |
| Moderada | Se corrige en el sprint | Se evalúa caso por caso |
| Baja | Se evalúa caso por caso | Se acepta si no hay una corrección compatible; se documenta |
