# Estrategia de branching

Se usa **GitHub Flow** con ramas de vida corta y una sola rama permanente, `main`.

## Ramas

| Rama | Uso | Ejemplo |
|---|---|---|
| `main` | Código estable y siempre desplegable. Protegida | — |
| `feature/<descripcion>` | Funcionalidad nueva | `feature/api-crear-incidente` |
| `fix/<descripcion>` | Corrección de errores | `fix/pipeline-fallo-controlado` |
| `refactor/<descripcion>` | Pago de deuda técnica sin cambiar el comportamiento | `refactor/normalizar-finales-linea` |

Las ramas salen de `main` actualizada. GitHub **borra automáticamente** la rama de cada PR al hacer el merge (*Automatically delete head branches*, activado desde el PR #20).

## Protección de `main`

Configurada en GitHub (Settings → Branches):

- Se exige Pull Request para todo cambio. No se permite `push` directo.
- La regla también aplica a administradores (`enforce_admins`).
- Aprobaciones requeridas: 0. El proyecto es individual y GitHub no permite aprobar un PR propio (ver "Revisión").
- **Check obligatorio `ArrowOps-CI`** (Azure Pipelines), con `strict`: la rama debe estar actualizada con `main`. Un PR con el pipeline en rojo queda `BLOCKED` (ver [fallos-pipeline.md](fallos-pipeline.md), F-02).
- **Checks obligatorios de GitHub Actions** (workflow `PR checks`): `Build y pruebas (Node 20)`, `Build y pruebas (Node 22)`, `Revision de dependencias` y `Escaneo de secretos`.

## PR de Dependabot

Dependabot abre PR semanales con la etiqueta `dependencias`. Como los genera un bot, sus commits no llevan `AB#`. Para mantener la trazabilidad, al revisarlos se agrega `AB#24` (análisis de dependencias) en la descripción del PR antes del merge. Deben pasar los mismos checks obligatorios que cualquier PR.

## Commits

Se sigue [Conventional Commits](https://www.conventionalcommits.org/) y **cada commit referencia su Work Item** de Azure Boards:

```
<tipo>: <descripcion> AB#<id>

feat: endpoint POST /api/incidents con pruebas AB#6 AB#4
```

Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`.

## Trazabilidad

- La integración GitHub ↔ Azure Boards enlaza automáticamente cada `AB#ID` de commits y PR con su Work Item. Los enlaces se ven en la sección **Development** del Work Item.
- El título y la descripción del PR también incluyen los `AB#ID`.
- Al hacer el merge, los Work Items pasan a `Closed`.

## Pull Requests

1. Se crea la rama desde `main` y se hacen commits con `AB#ID`.
2. Se abre el PR usando la plantilla [`.github/pull_request_template.md`](../.github/pull_request_template.md): Work Item, descripción, tipo de cambio, evidencia de validación y checklist.
3. **Revisión:** el proyecto es individual, así que se aplica auto-revisión documentada. Se revisa el diff completo y se dejan comentarios en las líneas con decisiones relevantes. La revisión queda registrada en GitHub con estado *COMMENTED*.
4. Merge solo con el check `ArrowOps-CI` en verde (lo exige GitHub).

## Estrategia de merge

| PR | Estrategia |
|---|---|
| #1, #2 | Merge commit |
| #3, #4 | Squash merge |

A partir del PR #5 se usará **merge commit**: conserva en `main` cada commit individual con su `AB#ID` de Task. El squash los junta en uno solo y solo mantiene el `AB#` del título (ver deuda TD-08).

## Historial de Pull Requests

| PR | Rama | Work Items | Versión |
|---|---|---|---|
| [#1](https://github.com/EmilioAlonzo4587/arrowops/pull/1) | `feature/api-crear-incidente` | AB#4, AB#5, AB#6 | v0.1.0 |
| [#2](https://github.com/EmilioAlonzo4587/arrowops/pull/2) | `feature/api-gestion-incidentes` | AB#7, AB#8, AB#9 | — |
| [#3](https://github.com/EmilioAlonzo4587/arrowops/pull/3) | `feature/frontend-listado` | AB#11, AB#12, AB#13 | — |
| [#4](https://github.com/EmilioAlonzo4587/arrowops/pull/4) | `feature/frontend-formulario` | AB#14, AB#15, AB#16 | v0.2.0 |
| [#5](https://github.com/EmilioAlonzo4587/arrowops/pull/5) | `feature/documentacion` | AB#32 | — |
| [#6](https://github.com/EmilioAlonzo4587/arrowops/pull/6) | `feature/azure-pipelines` | AB#20, AB#27, AB#24, AB#28 | — |
| [#7](https://github.com/EmilioAlonzo4587/arrowops/pull/7) | `fix/pipeline-fallo-controlado` | AB#28 | — |
| [#8](https://github.com/EmilioAlonzo4587/arrowops/pull/8) | `feature/github-actions` | AB#21, AB#24 | v0.3.0 |
| [#9](https://github.com/EmilioAlonzo4587/arrowops/pull/9) a [#13](https://github.com/EmilioAlonzo4587/arrowops/pull/13) | `dependabot/*` | AB#24 | — |
| [#14](https://github.com/EmilioAlonzo4587/arrowops/pull/14) | `feature/pruebas-y-secretos` | AB#22, AB#23, AB#24 | v0.4.0 |
| [#15](https://github.com/EmilioAlonzo4587/arrowops/pull/15) | `refactor/persistencia-postgres` | AB#30, AB#33 (TD-01) | — |
| [#16](https://github.com/EmilioAlonzo4587/arrowops/pull/16) | `refactor/normalizar-finales-linea` | AB#34 (TD-02) | — |
| [#17](https://github.com/EmilioAlonzo4587/arrowops/pull/17) | `feature/release-v1` | AB#29, AB#31 | **v1.0.0** |
| [#18](https://github.com/EmilioAlonzo4587/arrowops/pull/18) | `feature/cierre-release-v1` | AB#31 | — |
| [#19](https://github.com/EmilioAlonzo4587/arrowops/pull/19) | `feature/docker-compose-proyecto` | AB#41 | — |
| [#20](https://github.com/EmilioAlonzo4587/arrowops/pull/20) | `feature/v2-modelo-operacion` | AB#43 a AB#48 | (v2.0.0) |
| [#21](https://github.com/EmilioAlonzo4587/arrowops/pull/21) | `feature/v2-bitacora-dashboard` | AB#49 a AB#54 | (v2.0.0) |
| [#22](https://github.com/EmilioAlonzo4587/arrowops/pull/22) | `feature/release-v2` | AB#55 | v2.0.0 (no desplegada a prod) |
| [#23](https://github.com/EmilioAlonzo4587/arrowops/pull/23) | `fix/despliegue-artefacto-obsoleto` | AB#56 (Bug) | **v2.0.1** |
| [#24](https://github.com/EmilioAlonzo4587/arrowops/pull/24) | `feature/evidencias-release-v2` | AB#55 | — |
| [#25](https://github.com/EmilioAlonzo4587/arrowops/pull/25) | `feature/dashboard-interactivo` | AB#57 | (v2.1.0) |
| [#26](https://github.com/EmilioAlonzo4587/arrowops/pull/26) | `feature/interfaz-tecnica` | AB#58 | (v2.1.0) |
| [#27](https://github.com/EmilioAlonzo4587/arrowops/pull/27) | `feature/release-v2.1.0` | AB#59 | **v2.1.0** |
| [#28](https://github.com/EmilioAlonzo4587/arrowops/pull/28) | `feature/cierre-release-v2.1.0` | AB#59 | — |
