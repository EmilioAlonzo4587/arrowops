# Registro de deuda técnica

Deudas reales que se detectaron durante el desarrollo. Cada una tiene su Work Item en Azure Boards: Tasks con la etiqueta `deuda-tecnica`, hijas de AB#30, en el Sprint 3. Las que se resuelven se trabajan en ramas `refactor/*` con un PR trazable.

**Objetivo:** identificar al menos 5 deudas y resolver al menos 2 (Fase 3).

| ID | Deuda | Dónde se detectó | Impacto | Severidad | Estado |
|---|---|---|---|---|---|
| TD-01 | AB#33 | **Persistencia en memoria.** El repositorio guarda los incidentes en un `Map` y se pierden al reiniciar | Comentario de revisión del PR #1 | No apto para producción; los datos no sobreviven a un despliegue | Alta | **En resolución** (PR #15) |
| TD-02 | AB#34 | **Finales de línea sin normalizar.** No hay `.gitattributes`; Git avisa "LF will be replaced by CRLF" en cada commit desde Windows | Advertencias en todos los commits | Diffs ruidosos y posibles fallos de scripts en agentes Linux | Media | Identificada |
| TD-03 | AB#35 | **Sin linter ni formato automático.** No hay ESLint; `app.js` incluso tiene un comentario `eslint-disable` que no tiene efecto | Revisión del código del PR #1 | El estilo depende de la disciplina manual; los errores comunes no se detectan antes del PR | Media | Identificada |
| TD-04 | AB#36 | **Orden no determinista.** `list()` ordena por `createdAt`; los incidentes creados en el mismo milisegundo quedan en orden de inserción, no del más reciente al más antiguo | Comentario de revisión del PR #2 | El orden de la tabla puede variar entre recargas | Baja | Identificada |
| TD-05 | AB#37 | **Validación duplicada.** `frontend/src/form.js` repite las reglas de `backend/src/models/incident.js` | Revisión del PR #4 | Si cambia una regla en un lado y no en el otro, aparecen errores inconsistentes | Baja | Identificada |
| TD-06 | AB#38 | **Frontend sin pruebas.** Solo se prueba que se sirvan los archivos, no el comportamiento de `app.js` ni de `form.js` | Revisión del PR #4 | Las regresiones de la UI solo se detectan a mano | Media | Identificada |
| TD-07 | AB#39 | **Vulnerabilidades bajas en dependencias de desarrollo** (`jest` → `deepmerge`) | `npm audit` en el PR #1 | Riesgo bajo; no llega al artefacto de producción (ver [dependencias.md](dependencias.md)) | Baja | Aceptada (riesgo asumido) |
| TD-08 | AB#40 | **Pérdida de trazabilidad por squash merge.** Los PR #3 y #4 juntaron varios commits con `AB#` de Task en uno solo | Revisión del historial de `main` | Los commits de Task de esos PR solo se ven desde el PR | Baja | Mitigada: se usa merge commit desde el PR #5 |

## Plan de resolución (Fase 3)

| Orden | ID | Rama | Acción | Work Item |
|---|---|---|---|---|
| 1 | TD-01 | `refactor/persistencia-postgres` | PostgreSQL en Docker (`database/`), repositorio PostgreSQL con la misma interfaz, pruebas de integración en CI y `DATABASE_URL` como secreto | AB#33 |
| 2 | TD-02 | `refactor/normalizar-finales-linea` | Agregar `.gitattributes` (`* text=auto eol=lf`) y renormalizar | AB#34 |
| Opcional | TD-03 | `refactor/eslint` | Agregar ESLint, el script `npm run lint` y el paso de lint en CI | AB#35 |

**Criterio de priorización:** primero el impacto (severidad), después el costo. TD-01 es la única deuda de severidad alta: sin persistencia, la app no es apta para v1.0.0. TD-02 es de bajo costo y elimina ruido en todos los commits y riesgos en los agentes Linux.

Las demás (TD-03 a TD-06) quedan en el backlog con su prioridad para versiones posteriores a v1.0.0. TD-07 está aceptada y TD-08 mitigada.
## Historial

| Fecha | Cambio |
|---|---|
| 2026-10-28 | Registro inicial: TD-01 a TD-08 |
| 2026-10-29 | TD-07: jest 30 (PR #12) reduce las vulnerabilidades bajas de 6 a 5, pero `deepmerge` sigue presente; se mantiene aceptada |
| 2026-10-29 | Se registran las deudas en Azure Boards (AB#33 a AB#40). **Se reprioriza TD-01:** con Docker Desktop ya disponible en el equipo de desarrollo, migrar a PostgreSQL deja de exceder el alcance de v1.0.0. Pasa a ser la primera deuda a resolver, por ser la de mayor impacto; TD-03 queda como opcional |
