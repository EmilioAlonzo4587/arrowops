# Registro de deuda técnica

Deudas reales que se detectaron durante el desarrollo. Cada una tendrá su Work Item en Azure Boards, y las que se resuelvan se trabajarán en ramas `refactor/*` o `fix/*` con un PR trazable.

**Objetivo:** identificar al menos 5 deudas y resolver al menos 2 (Fase 3).

| ID | Deuda | Dónde se detectó | Impacto | Severidad | Estado |
|---|---|---|---|---|---|
| TD-01 | **Persistencia en memoria.** El repositorio guarda los incidentes en un `Map` y se pierden al reiniciar | Comentario de revisión del PR #1 | No apto para producción; los datos no sobreviven a un despliegue | Alta | Identificada |
| TD-02 | **Finales de línea sin normalizar.** No hay `.gitattributes`; Git avisa "LF will be replaced by CRLF" en cada commit desde Windows | Advertencias en todos los commits | Diffs ruidosos y posibles fallos de scripts en agentes Linux | Media | Identificada |
| TD-03 | **Sin linter ni formato automático.** No hay ESLint; `app.js` incluso tiene un comentario `eslint-disable` que no tiene efecto | Revisión del código del PR #1 | El estilo depende de la disciplina manual; los errores comunes no se detectan antes del PR | Media | Identificada |
| TD-04 | **Orden no determinista.** `list()` ordena por `createdAt`; los incidentes creados en el mismo milisegundo quedan en orden de inserción, no del más reciente al más antiguo | Comentario de revisión del PR #2 | El orden de la tabla puede variar entre recargas | Baja | Identificada |
| TD-05 | **Validación duplicada.** `frontend/src/form.js` repite las reglas de `backend/src/models/incident.js` | Revisión del PR #4 | Si cambia una regla en un lado y no en el otro, aparecen errores inconsistentes | Baja | Identificada |
| TD-06 | **Frontend sin pruebas.** Solo se prueba que se sirvan los archivos, no el comportamiento de `app.js` ni de `form.js` | Revisión del PR #4 | Las regresiones de la UI solo se detectan a mano | Media | Identificada |
| TD-07 | **Vulnerabilidades bajas en dependencias de desarrollo** (`jest` → `deepmerge`) | `npm audit` en el PR #1 | Riesgo bajo; no llega al artefacto de producción (ver [dependencias.md](dependencias.md)) | Baja | Aceptada (riesgo asumido) |
| TD-08 | **Pérdida de trazabilidad por squash merge.** Los PR #3 y #4 juntaron varios commits con `AB#` de Task en uno solo | Revisión del historial de `main` | Los commits de Task de esos PR solo se ven desde el PR | Baja | Mitigada: se usa merge commit desde el PR #5 |

## Plan de resolución (Fase 3)

| ID | Rama | Acción | Work Item |
|---|---|---|---|
| TD-02 | `refactor/normalizar-finales-linea` | Agregar `.gitattributes` (`* text=auto eol=lf`) y renormalizar | Por crear |
| TD-03 | `refactor/eslint` | Agregar ESLint, el script `npm run lint` y el paso de lint en CI | Por crear |

Las demás quedan en el backlog con su prioridad para versiones posteriores a v1.0.0. TD-01 es la de mayor impacto, pero cambiar a una base de datos real queda fuera del alcance de v1.0.0.

## Historial

| Fecha | Cambio |
|---|---|
| 2026-10-28 | Registro inicial: TD-01 a TD-08 |
| 2026-10-29 | TD-07: jest 30 (PR #12) reduce las vulnerabilidades bajas de 6 a 5, pero `deepmerge` sigue presente; se mantiene aceptada |
