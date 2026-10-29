// Migraciones versionadas: aplica en orden los archivos de database/migrations que falten
// y los registra en schema_migrations. Cada migracion corre en su propia transaccion.
const fs = require('node:fs');
const path = require('node:path');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', '..', 'database', 'migrations');
// Evita que dos procesos (por ejemplo, dos replicas al arrancar) migren a la vez.
const LOCK_ID = 727274;

async function runMigrations(pool, { dir = MIGRATIONS_DIR, log = () => {} } = {}) {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT        PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

    const { rows } = await client.query('SELECT version FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.version));
    const pending = fs.readdirSync(dir)
      .filter((file) => file.endsWith('.sql'))
      .sort()
      .map((file) => ({ file, version: file.replace(/\.sql$/, '') }))
      .filter(({ version }) => !applied.has(version));

    for (const { file, version } of pending) {
      await client.query('BEGIN');
      try {
        await client.query(fs.readFileSync(path.join(dir, file), 'utf8'));
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        await client.query('COMMIT');
        log(`Migracion aplicada: ${version}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`La migracion ${version} fallo y se revirtio: ${err.message}`);
      }
    }
    return pending.map(({ version }) => version);
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
    client.release();
  }
}

module.exports = { runMigrations, MIGRATIONS_DIR };
