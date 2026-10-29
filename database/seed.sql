-- Datos de ejemplo para desarrollo y evaluacion. Los carga la app al arrancar si
-- SEED_DEMO_DATA=true y la tabla esta vacia (nunca en dev/prod del pipeline).
INSERT INTO incidents (title, description, priority, category, status, technician_id, reporter) VALUES
    ('Impresora del piso 2 sin conexion', 'No responde desde la red interna.', 'media', 'hardware', 'NUEVO', NULL, 'mesa.ayuda'),
    ('Correo corporativo caido', 'Outlook no sincroniza desde las 8:00.', 'critica', 'software', 'EN_PROCESO',
        (SELECT id FROM technicians WHERE name = 'Ana Lopez'), 'soporte.n2'),
    ('VPN rechaza credenciales', 'Error de autenticacion al conectar desde casa.', 'alta', 'accesos', 'ASIGNADO',
        (SELECT id FROM technicians WHERE name = 'Carlos Perez'), 'rrhh'),
    ('Monitor parpadea', 'Equipo de recepcion, cable HDMI flojo.', 'baja', 'hardware', 'RESUELTO',
        (SELECT id FROM technicians WHERE name = 'Maria Garcia'), 'mesa.ayuda'),
    ('Wifi intermitente en sala de juntas', 'Se desconecta cada 10 minutos.', 'media', 'red', 'CERRADO',
        (SELECT id FROM technicians WHERE name = 'Jorge Ramirez'), 'recepcion'),
    ('Servidor de archivos sin espacio', 'Unidad compartida al 99%.', 'critica', 'hardware', 'NUEVO', NULL, 'contabilidad');
