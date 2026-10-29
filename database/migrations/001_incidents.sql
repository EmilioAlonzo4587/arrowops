-- 001: esquema inicial de ArrowOps (v1.0.0). Idempotente: las bases creadas con el antiguo
-- database/schema.sql ya tienen esta tabla, y aqui solo queda registrada como aplicada.

CREATE TABLE IF NOT EXISTS incidents (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(120)  NOT NULL CHECK (length(trim(title)) > 0),
    description VARCHAR(2000) NOT NULL CHECK (length(trim(description)) > 0),
    priority    TEXT          NOT NULL CHECK (priority IN ('baja', 'media', 'alta', 'critica')),
    status      TEXT          NOT NULL DEFAULT 'abierto'
                              CHECK (status IN ('abierto', 'en_progreso', 'resuelto', 'cerrado')),
    reporter    TEXT,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incidents_status     ON incidents (status);
CREATE INDEX IF NOT EXISTS idx_incidents_priority   ON incidents (priority);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents (created_at DESC);
