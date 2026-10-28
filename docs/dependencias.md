# Análisis de dependencias

## Inventario

Las versiones están fijadas exactamente en `package.json` (`--save-exact`). `package-lock.json` está versionado para que las instalaciones sean reproducibles con `npm ci`.

| Paquete | Versión | Tipo | Uso |
|---|---|---|---|
| `express` | 4.22.3 | producción | Servidor HTTP y API |
| `jest` | 29.7.0 | desarrollo | Ejecución de pruebas |
| `supertest` | 7.3.1 | desarrollo | Pruebas HTTP de la API |

## Herramientas

| Herramienta | Cuándo | Estado |
|---|---|---|
| `npm audit` | Manual, en cada cambio de dependencias | Implementado |
| `npm audit` en Azure Pipelines | En cada ejecución del pipeline | Planificado (Fase 2) |
| Revisión de dependencias en GitHub Actions | En cada PR | Planificado (Fase 2) |
| Dependabot | Alertas y PR de actualización semanales | Planificado (Fase 2) |

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

## Criterio de decisión

| Severidad | Producción | Desarrollo |
|---|---|---|
| Crítica / Alta | Se corrige antes del merge; el pipeline falla | Se corrige o se justifica por escrito |
| Moderada | Se corrige en el sprint | Se evalúa caso por caso |
| Baja | Se evalúa caso por caso | Se acepta si no hay una corrección compatible; se documenta |
