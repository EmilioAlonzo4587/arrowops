# Registro de fallos del pipeline

Cada fallo de `ArrowOps-CI` se registra con su evidencia, diagnóstico, corrección y la ejecución exitosa que lo confirma.

## F-01: falla el paso "Reporte completo de dependencias" (PR #6)

| Campo | Detalle |
|---|---|
| Fecha | 2026-10-29 |
| Ejecución fallida | [#20261029.2](https://dev.azure.com/devopsArrow/ArrowOps/_build/results?buildId=11) (buildId 11), disparada por el PR #6 (`refs/pull/6/merge`) |
| Agente | `PC-EMILIO` (pool `ArrowOps-SelfHosted`) |
| Paso que falló | *Reporte completo de dependencias (informativo)*: `Cmd.exe exited with code '1'` |
| Efecto | Se omitieron *Empaquetar artefacto* y *Publicar artefacto*; el check de GitHub quedó en rojo |
| Work Items | AB#28 (fallo del pipeline), AB#24 (análisis de dependencias) |

### Evidencia (log del paso, buildId 11, log 13)

```
uuid  <11.1.1
Missing buffer bounds check in v3/v5/v6 when buf is provided - GHSA-w5hq-g745-h8pq
  jest-junit  9.0.0 - 16.0.0
  Depends on vulnerable versions of uuid
8 vulnerabilities (6 low, 2 moderate)
ECHO está activado.
##[error]Cmd.exe exited with code '1'.
```

### Diagnóstico

Se encontraron dos causas independientes:

1. **Error en el YAML del paso.** El script era `npm audit || echo ##vso[task.logissue ...]`, escrito como escalar plano de YAML.
   - En YAML, ` #` (espacio y almohadilla) inicia un comentario. Todo desde `##vso` se descartó y el script real quedó como `npm audit || echo`. Por eso el log muestra `ECHO está activado.`, que es la salida de `echo` sin argumentos.
   - En cmd, `echo` no reinicia `ERRORLEVEL`, así que el paso heredó el código 1 de `npm audit`.
2. **Vulnerabilidad nueva.** Al agregar `jest-junit@16.0.0` para los reportes de pruebas entró `uuid@8.3.2`, afectado por [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) (moderada). El conteo pasó de 6 vulnerabilidades bajas a 6 bajas y 2 moderadas.

La ejecución anterior en la misma rama ([#20261029.1](https://dev.azure.com/devopsArrow/ArrowOps/_build/results?buildId=10)) no falló porque el paso todavía tenía `continueOnError: true`. Quitar ese ajuste dejó al descubierto los dos problemas.

### Corrección

| Causa | Corrección |
|---|---|
| YAML | El script pasó a un bloque literal (`script: \|`), donde `#` no es comentario. Ahora usa `call npm audit` (para que cmd recupere el control después de `npm.cmd`), `if errorlevel 1 echo ##vso[task.logissue type=warning]...` y `exit /b 0`. Se probó en local con `cmd /c`: registra la advertencia y termina con código 0 |
| Dependencia | `jest-junit` 16.0.0 → 17.0.0, que trae `uuid` 14.0.3. `npm audit` vuelve a 6 vulnerabilidades bajas; las 22 pruebas y el reporte JUnit siguen funcionando |

### Ejecución exitosa

[#20261029.3](https://dev.azure.com/devopsArrow/ArrowOps/_build/results?buildId=12) (buildId 12), disparada por el PR #6 con los commits `9e9a04e` y `f0774a5`: resultado **succeeded**. Todos los pasos en verde, el audit informativo registra una advertencia (6 vulnerabilidades bajas aceptadas) y se publicó el artefacto `arrowops`.

### Lecciones (F-01)

- En YAML, los scripts con `#`, `:` o caracteres especiales van en un bloque literal (`|`).
- En los agentes Windows, los pasos `script` corren en cmd: usar `call` para los `.cmd` (como npm) y `exit /b` explícito.
- Cada dependencia nueva, incluso las de desarrollo, se audita antes del PR. El pipeline lo detectó, que es justo su función.

## F-02: fallo controlado, una regresión en la validación del título (PR #7)

Fallo **provocado a propósito** para demostrar que el pipeline detecta regresiones y que la protección de `main` impide integrarlas.

| Campo | Detalle |
|---|---|
| Fecha | 2026-10-29 |
| Rama / PR | `fix/pipeline-fallo-controlado` / [#7](https://github.com/EmilioAlonzo4587/arrowops/pull/7) |
| Cambio provocado | Commit `7789731`: `TITLE_MAX` baja de 120 a 100 en `backend/src/models/incident.js`, sin actualizar las pruebas ni el `maxlength="120"` del formulario |
| Ejecución fallida | [#20261029.6](https://dev.azure.com/devopsArrow/ArrowOps/_build/results?buildId=15) (buildId 15) |
| Paso que falló | *Pruebas con cobertura*: `Tests: 1 failed, 21 passed, 22 total`. *Publicar resultados de pruebas* también se marcó fallido (`failTaskOnFailedTests`) |
| Pasos omitidos | Revisión de dependencias, empaquetado y publicación del artefacto: **no se generó un artefacto con la regresión** |
| Bloqueo en GitHub | Check `ArrowOps-CI` en rojo; el estado del PR es `BLOCKED` (*Required statuses must pass before merging*) |
| Work Item | AB#28 |

### Evidencia (log del paso, buildId 15, log 9)

```
PASS tests/api/frontend.test.js
FAIL tests/api/incidents.create.test.js
   validateIncident › rechaza un titulo demasiado largo
    expect(received).toEqual(expected) // deep equality
Tests:       1 failed, 21 passed, 22 total
```

### Diagnóstico

- La prueba envía un título de 121 caracteres y espera un error que mencione el límite `120`. Recibió `title no puede superar 100 caracteres.`.
- El límite de 120 es un **contrato** compartido entre el backend y el formulario (`maxlength="120"`). Cambiarlo solo en el backend rompe ese contrato: el formulario permite escribir 101 a 120 caracteres que la API rechaza.
- **Causa raíz:** se cambió una regla de negocio sin actualizar sus pruebas ni el otro extremo del contrato.

### Corrección

- Se restaura `TITLE_MAX = 120`.
- Se agrega la prueba del valor límite `acepta un titulo de exactamente 120 caracteres`, que fija el contrato y referencia el `maxlength` del formulario. Faltaba: solo se probaba el caso de 121.
- Local: `npm test` → 23 pruebas en verde.

### Ejecución exitosa

[#20261029.7](https://dev.azure.com/devopsArrow/ArrowOps/_build/results?buildId=16) (buildId 16), disparada por el PR #7 con el commit `91e7bc6`: resultado **succeeded**, 23 pruebas en verde y el artefacto publicado. El estado del PR pasó de `BLOCKED` a `CLEAN`, así que el merge quedó habilitado.

### Lecciones (F-02)

- El check obligatorio funcionó: la regresión no pudo entrar a `main` y no se generó el artefacto.
- Los límites que comparten el frontend y el backend necesitan pruebas de los valores límite (N y N+1), no solo del caso inválido.
- Duplicar las reglas entre el cliente y el servidor (deuda TD-05) hace que este tipo de error sea más probable.

## F-03: falla "Revision de dependencias" en GitHub Actions (PR #8)

| Campo | Detalle |
|---|---|
| Fecha | 2026-10-29 |
| Workflow / job | `PR checks` / `Revision de dependencias` (`actions/dependency-review-action@v4`) |
| Error | `Dependency review is not supported on this repository. Please ensure that Dependency graph is enabled` |
| Diagnóstico | Es un problema de configuración del repositorio, no del código: la acción necesita el *Dependency graph* de GitHub, que estaba desactivado. Los otros 3 checks del PR (ArrowOps-CI y las pruebas con Node 20 y 22) estaban en verde |
| Corrección | Se activaron las alertas de Dependabot (`PUT /repos/{owner}/{repo}/vulnerability-alerts`, respuesta 204), lo que habilita el Dependency graph, y se volvió a ejecutar el job fallido (`gh run rerun --failed`) |
| Ejecución exitosa | Run `40802055601` → **success**; los 4 checks del PR #8 en verde |
| Lección | Las acciones de seguridad de GitHub dependen de funciones del repositorio que hay que activar y documentar como parte de la configuración (ver [seguridad.md](seguridad.md)) |

## F-04: el despliegue del tag v2.0.0 tomó un artefacto obsoleto (detenido por la aprobación)

| Campo | Detalle |
|---|---|
| Fecha | 2026-10-29 |
| Ejecución | [#20261029.48](https://dev.azure.com/devopsArrow/ArrowOps/_build/results?buildId=57) (buildId 57), tag `v2.0.0` |
| Síntoma | `Deploy_dev` terminó en verde, pero `http://localhost:8081/health` respondía `"version":"1.0.0"` en lugar de `2.0.0` |
| Contención | La etapa `Deploy_prod` esperaba la **aprobación manual**. Se **rechazó** (`Checkpoint.Approval: failed`) y **prod no se tocó**: siguió en 1.0.0 con sus datos |
| Work Item | Bug **AB#56** (severidad alta) |

### Diagnóstico

1. **Workspace sucio en el agente autohospedado.** `download: current` agrega archivos sin limpiar la carpeta, y en `C:\agents\arrowops\_work\1\arrowops\` había dos artefactos: `arrowops-1.0.0.tgz` (de un despliegue anterior) y `arrowops-2.0.0.tgz`.
2. **Resolución de versión permisiva.** `Get-ChildItem ... | Select-Object -First 1` tomó el primero en orden alfabético: **1.0.0**.
3. **Validación autorreferente.** El health check comparaba la versión del ambiente con la versión **resuelta en el paso anterior** (1.0.0), así que confirmó el error en vez de detectarlo.
4. **Etiqueta de imagen mutable.** `arrowops:1.0.0` se reconstruyó en varias ejecuciones con código distinto, porque los merges a `main` anteriores al cambio de versión también eran "1.0.0". La etiqueta no identificaba un build concreto.

Los agentes de Microsoft son efímeros y no tienen este problema; es propio de un agente autohospedado, que reutiliza su disco entre ejecuciones.

### Corrección (PR #23, v2.0.1)

| Causa | Corrección |
|---|---|
| Workspace sucio | `workspace: clean: all` en los jobs de despliegue de `dev` y `prod` |
| Resolución permisiva | El paso falla si no hay **exactamente un** `.tgz`. En los tags, también falla si la versión del artefacto no coincide con la del tag |
| Validación autorreferente | En los tags, la versión esperada ahora sale del **tag**, una fuente independiente del artefacto |
| Etiqueta mutable | La imagen se etiqueta `arrowops:<versión>-<buildId>`, inmutable por ejecución |

Se probó la lógica nueva en local con los 4 escenarios: dos artefactos → falla; tag con otra versión → falla; tag correcto → pasa; `main` → pasa.

**Versionado:** el tag `v2.0.0` **no se reescribe**, porque un tag publicado es inmutable. Queda documentado como *no desplegado a producción*. La corrección se publica como **v2.0.1** (PATCH).

### Lecciones (F-04)

- La aprobación manual no es un trámite: detuvo un despliegue defectuoso antes de llegar a producción.
- Una validación tiene que comparar contra una fuente independiente de lo que se está validando.
- En agentes autohospedados hay que limpiar el workspace explícitamente.
- Las etiquetas de imagen deben ser inmutables, para que cada despliegue y cada rollback apunten a un build exacto.
