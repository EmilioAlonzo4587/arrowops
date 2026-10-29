// Carga database/seed.sql solo si la tabla de incidentes esta vacia.
// Se activa con SEED_DEMO_DATA=true (docker compose de la raiz); nunca en dev/prod del pipeline.
const fs = require('node:fs');
const path = require('node:path');

const SEED_FILE = path.join(__dirname, '..', '..', '..', 'database', 'seed.sql');

async function seedDemoData(pool) {
  const { rows } = await pool.query('SELECT count(*)::int AS total FROM incidents');
  if (rows[0].total > 0) return false;
  await pool.query(fs.readFileSync(SEED_FILE, 'utf8'));
  return true;
}

module.exports = { seedDemoData };
