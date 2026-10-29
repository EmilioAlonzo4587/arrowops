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
