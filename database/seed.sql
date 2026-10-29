-- Datos de ejemplo para desarrollo local. Solo se cargan al crear el volumen.
INSERT INTO incidents (title, description, priority, status, reporter) VALUES
    ('Impresora del piso 2 sin conexion', 'No responde desde la red interna.', 'media', 'abierto', 'mesa.ayuda'),
    ('Correo corporativo caido', 'Outlook no sincroniza desde las 8:00.', 'critica', 'en_progreso', 'soporte.n2'),
    ('VPN rechaza credenciales', 'Error de autenticacion al conectar desde casa.', 'alta', 'abierto', NULL),
    ('Monitor parpadea', 'Equipo de recepcion, cable HDMI flojo.', 'baja', 'resuelto', 'mesa.ayuda');
