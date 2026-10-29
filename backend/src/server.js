const { Pool } = require('pg');
const { createApp } = require('./app');
const { loadConfig } = require('./config');
const { createIncidentRepository } = require('./repositories/incidentRepository');
const { createPostgresIncidentRepository } = require('./repositories/postgresIncidentRepository');

const config = loadConfig();

// Con DATABASE_URL se usa PostgreSQL; sin ella, el repositorio en memoria (desarrollo rapido).
const pool = config.databaseUrl ? new Pool({ connectionString: config.databaseUrl }) : null;
const repository = pool ? createPostgresIncidentRepository(pool) : createIncidentRepository();
const storage = pool ? 'PostgreSQL' : 'memoria';

const server = createApp({ repository }).listen(config.port, () => {
  console.log(
    `ArrowOps ${config.appVersion} (${config.nodeEnv}, almacenamiento: ${storage}) ` +
      `escuchando en http://localhost:${config.port}`,
  );
});

// Cierre ordenado: deja de aceptar conexiones y libera el pool de PostgreSQL.
function shutdown() {
  server.close(() => {
    if (pool) pool.end();
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
