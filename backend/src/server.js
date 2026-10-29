const { Pool } = require('pg');
const { createApp } = require('./app');
const { loadConfig } = require('./config');
const { runMigrations } = require('./db/migrate');
const { seedDemoData } = require('./db/seed');
const { createIncidentRepository } = require('./repositories/incidentRepository');
const { createPostgresIncidentRepository } = require('./repositories/postgresIncidentRepository');

async function main() {
  const config = loadConfig();

  // Con DATABASE_URL se usa PostgreSQL; sin ella, el repositorio en memoria (desarrollo rapido).
  const pool = config.databaseUrl ? new Pool({ connectionString: config.databaseUrl }) : null;
  if (pool) {
    // El esquema se actualiza solo al arrancar: cada despliegue aplica las migraciones pendientes.
    await runMigrations(pool, { log: console.log });
    if (config.seedDemoData && (await seedDemoData(pool))) {
      console.log('Datos de ejemplo cargados (SEED_DEMO_DATA=true).');
    }
  }
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
}

main().catch((err) => {
  console.error(`No se pudo iniciar ArrowOps: ${err.message}`);
  process.exit(1);
});
