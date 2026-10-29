# Evidencias

Registro de dónde se puede verificar cada requisito. Las capturas de pantalla del proyecto **no se publican en este repositorio público**, porque contienen datos personales. Se entregan aparte, en el informe.

| Requisito | Evidencia | Dónde verificarla |
|---|---|---|
| Azure Boards | Epics, Features, Stories y Tasks con responsable, prioridad, estimación, estado y sprint | Azure DevOps → Boards → Backlogs / Sprints. IDs en [../backlog-ids.csv](../backlog-ids.csv) |
| Ramas, PR y trazabilidad | 28 PR con plantilla, revisión en el diff, checks obligatorios y `AB#ID` | GitHub → Pull requests (cerrados); sección *Development* de cada Work Item |
| Azure Pipelines y agente autohospedado | Etapas CI, `Deploy_dev` y `Deploy_prod` en el agente `PC-EMILIO` | Azure DevOps → Pipelines → `ArrowOps-CI` |
| Fallos con diagnóstico | F-01 (YAML y `uuid`), F-02 (fallo provocado), F-03 (Dependency graph) y F-04 (artefacto obsoleto) | [../fallos-pipeline.md](../fallos-pipeline.md) |
| Dependencias | Audits, Dependabot (PR #9 a #13) y decisiones | [../dependencias.md](../dependencias.md) |
| Aprobación de producción | v1.0.0 aprobada (build 46), **v2.0.0 rechazada** (build 57, F-04), v2.0.1 aprobada (build 60) y v2.1.0 aprobada (build 70) | Azure DevOps → Pipelines → Environments → `arrowops-prod` → historial de despliegues y aprobaciones |
| Releases y artefactos | `v1.0.0`, `v2.0.1` y `v2.1.0` con su `.tgz` y SHA-256 | GitHub → Releases |
| Migración de datos en producción | Incidente v1 conservado (`abierto` → `NUEVO`) | [../release.md](../release.md), checklist v2.0.1 |

## Capturas entregadas aparte

| # | Captura | Qué muestra |
|---|---|---|
| 1 | Epic AB#2 en Boards | Responsable, estado, prioridad 1, estimación (Effort 26) y Features hijas |
| 2 | Taskboard del Sprint 1 | Stories y Tasks en las columnas New, Active y Closed |
| 3 | Creación del pipeline | `ArrowOps-CI` creado desde `azure-pipelines.yml` |
| 4 | PR de Dependabot | Actualizaciones de express, jest y actions con sus 4 checks |
| 5 | Despliegue a dev | El despliegue a `dev` esperando la autorización del Environment |
| 6 | Release v1.0.0 | **Desplegar en prod esperando** la aprobación manual |
| 7 | Release v2.0.0 | **Desplegar en prod rechazado** ("1 checks failed") por el fallo F-04 |
| 8 | Interfaz rediseñada (primera versión) | Vista de escritorio del rediseño de la v2.1.0 |
| 9 | Interfaz en móvil | La misma vista a 390 px: tarjetas en 2 columnas y formularios en 1 |
| 10 | Interfaz con los colores finales | Encabezado azul petróleo, fondo gris azulado y *Abiertos por técnico* con todos los técnicos |
| 11 | GitHub Release v2.1.0 | Notas, enlace a la ejecución 70 y `arrowops-2.1.0.tgz` con su SHA-256 |
| 12 | Producción en v2.1.0 | La app en `:8080` con "Sistema operativo · v2.1.0" |
| 13 | Code review: PR #25 | Plantilla del PR completa, con Work Item, evidencia y checklist de auto-revisión |
| 14 | Code review: comentarios en el diff | Comentario de revisión sobre una línea concreta del PR #25 |
| 15 | Versiones (tags) | Tags de `v0.1.0` a `v2.1.0` |
| 16 | Releases | GitHub Releases v1.0.0, v2.0.1 y v2.1.0 |
| 17 | Pull requests cerrados | Los 28 PR integrados, con su `AB#ID`, tareas del checklist y checks en verde |
