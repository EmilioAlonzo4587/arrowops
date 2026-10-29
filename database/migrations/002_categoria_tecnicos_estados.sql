-- 002 (v2.0.0): categoria, catalogo de tecnicos, asignacion y estados del proceso.
-- Convierte los datos existentes; no se pierde ningun incidente.

-- Catalogo de tecnicos (datos de referencia: tambien existen en produccion).
CREATE TABLE technicians (
    id     SERIAL  PRIMARY KEY,
    name   TEXT    NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO technicians (name) VALUES
    ('Ana Lopez'),
    ('Carlos Perez'),
    ('Maria Garcia'),
    ('Jorge Ramirez');

-- Categoria: los incidentes existentes quedan como 'otro' y se pueden reclasificar.
ALTER TABLE incidents
    ADD COLUMN category TEXT NOT NULL DEFAULT 'otro'
        CONSTRAINT incidents_category_check
        CHECK (category IN ('hardware', 'software', 'red', 'accesos', 'otro'));

-- Tecnico asignado (opcional mientras el incidente esta NUEVO).
ALTER TABLE incidents ADD COLUMN technician_id INTEGER REFERENCES technicians (id);

-- Estados v1 -> v2. Los incidentes en curso o cerrados sin tecnico se conservan tal cual;
-- las reglas de asignacion se aplican a partir de los cambios siguientes.
ALTER TABLE incidents DROP CONSTRAINT incidents_status_check;
UPDATE incidents SET status = CASE status
    WHEN 'abierto'     THEN 'NUEVO'
    WHEN 'en_progreso' THEN 'EN_PROCESO'
    WHEN 'resuelto'    THEN 'RESUELTO'
    WHEN 'cerrado'     THEN 'CERRADO'
END;
ALTER TABLE incidents ALTER COLUMN status SET DEFAULT 'NUEVO';
ALTER TABLE incidents ADD CONSTRAINT incidents_status_check
    CHECK (status IN ('NUEVO', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'CERRADO'));

CREATE INDEX idx_incidents_category   ON incidents (category);
CREATE INDEX idx_incidents_technician ON incidents (technician_id);
