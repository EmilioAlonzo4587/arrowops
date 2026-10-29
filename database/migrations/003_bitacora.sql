-- 003 (v2.0.0): bitacora de cada incidente (eventos automaticos y comentarios).

CREATE TABLE incident_events (
    id            BIGSERIAL    PRIMARY KEY,
    incident_id   UUID         NOT NULL REFERENCES incidents (id) ON DELETE CASCADE,
    type          TEXT         NOT NULL
                               CHECK (type IN ('creado', 'editado', 'asignado', 'estado', 'comentario')),
    author        TEXT,
    message       VARCHAR(1000),
    from_status   TEXT,
    to_status     TEXT,
    technician_id INTEGER      REFERENCES technicians (id),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_incident_events_incident ON incident_events (incident_id, created_at);

-- Los incidentes existentes empiezan su historial con el evento de creacion.
INSERT INTO incident_events (incident_id, type, author, to_status, created_at)
SELECT id, 'creado', reporter, status, created_at FROM incidents;
