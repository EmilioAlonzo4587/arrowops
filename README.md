# ArrowOps

ArrowOps es una solución web para registrar, dar seguimiento y cerrar incidentes de TI. El proyecto demuestra un proceso DevOps verificable, desde la necesidad del negocio hasta la versión `v1.0.0`.

## Estructura

| Carpeta | Contenido |
|---|---|
| `backend/` | API REST (Node.js + Express) con el CRUD de incidentes |
| `frontend/` | Interfaz web |
| `database/` | Esquema y datos iniciales |
| `tests/` | Pruebas automatizadas |
| `devops/` | Scripts de Azure Boards, agente autohospedado y utilidades DevOps |
| `docs/` | Documentación, decisiones, dependencias y registro de deuda técnica |
| `.github/workflows/` | GitHub Actions |
| `azure-pipelines.yml` | Pipeline de CI/CD en Azure Pipelines |

## Flujo de trabajo

- Rama principal: `main` (protegida, solo entra código por Pull Request).
- Ramas de trabajo: `feature/<id>-<descripcion>`, `fix/<id>-<descripcion>`.
- Cada commit referencia su Work Item de Azure Boards: `git commit -m "feat: crear incidente AB#123"`.
- Revisión de PR: proyecto individual, por lo que se aplica **auto-revisión** documentada. Cada PR usa la plantilla `.github/pull_request_template.md` (checklist de revisión y evidencia de validación), incluye comentarios de revisión en el diff y solo se integra con los checks de CI en verde.
- Versionado semántico (`MAJOR.MINOR.PATCH`) hasta `v1.0.0`.

## Fases

1. **Planificación y desarrollo base:** backlog, CRUD y primeros PR.
2. **CI, calidad y seguridad:** pipelines, pruebas, secretos, análisis de dependencias, agente autohospedado, fallo controlado.
3. **Estabilización y release:** deuda técnica, versionado y empaquetado del artefacto.
