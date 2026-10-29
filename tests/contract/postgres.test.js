// Pruebas de integracion contra PostgreSQL real. Requieren DATABASE_URL;
// en CI la definen GitHub Actions (servicio postgres) y Azure Pipelines (docker compose).
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Pool } = require('pg');
const request = require('supertest');
const { createApp } = require('../../backend/src/app');
const { runMigrations, MIGRATIONS_DIR } = require('../../backend/src/db/migrate');
const { seedDemoData } = require('../../backend/src/db/seed');
const { createPostgresIncidentRepository } = require('../../backend/src/repositories/postgresIncidentRepository');
const { describeIncidentRepositoryContract } = require('./incidentRepository.contract');

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

// Base de datos desde cero: borra el esquema publico completo.
async function resetDatabase(pool) {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
}

describeIfDb('PostgreSQL', () => {
  let pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
    await resetDatabase(pool);
    await runMigrations(pool);
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE incidents');
  });

  afterAll(async () => {
    await pool.end();
  });

  describeIncidentRepositoryContract('PostgreSQL', () => createPostgresIncidentRepository(pool));

  test('la API completa funciona sobre PostgreSQL', async () => {
    const app = createApp({ repository: createPostgresIncidentRepository(pool) });
    const incident = { title: 'Disco lleno', description: 'Servidor de logs al 99%.', priority: 'alta', category: 'hardware' };

    const created = await request(app).post('/api/incidents').send(incident);
    expect(created.status).toBe(201);

    const assigned = await request(app).patch(`/api/incidents/${created.body.id}/assign`).send({ technicianId: 1 });
    expect(assigned.body.status).toBe('ASIGNADO');

    const list = await request(app).get('/api/incidents?technicianId=1&category=hardware');
    expect(list.body.map((i) => i.id)).toEqual([created.body.id]);

    const deleted = await request(app).delete(`/api/incidents/${created.body.id}`);
    expect(deleted.status).toBe(204);
  });

  test('la base de datos rechaza valores fuera del esquema', async () => {
    await expect(
      pool.query("INSERT INTO incidents (title, description, priority, category) VALUES ('t', 'd', 'alta', 'impresoras')"),
    ).rejects.toThrow(/check constraint/);
    await expect(
      pool.query("INSERT INTO incidents (title, description, priority, status) VALUES ('t', 'd', 'alta', 'abierto')"),
    ).rejects.toThrow(/check constraint/);
  });

  test('las migraciones quedan registradas y no se repiten', async () => {
    const { rows } = await pool.query('SELECT version FROM schema_migrations ORDER BY version');
    const expected = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).map((f) => f.replace('.sql', ''));
    expect(rows.map((r) => r.version)).toEqual(expected.sort());
    expect(await runMigrations(pool)).toEqual([]);
  });

  test('los datos de ejemplo se cargan solo con la base vacia', async () => {
    expect(await seedDemoData(pool)).toBe(true);
    const { rows } = await pool.query('SELECT count(*)::int AS total FROM incidents');
    expect(rows[0].total).toBeGreaterThan(0);
    expect(await seedDemoData(pool)).toBe(false);
  });

  // Simula una base desplegada con v1.0.0 (solo la migracion 001 y datos con los estados viejos)
  // y verifica que la migracion 002 la convierte sin perder incidentes.
  test('migrar una base v1.0.0 a v2 convierte los estados y conserva los datos', async () => {
    const v1Dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrowops-v1-'));
    fs.copyFileSync(path.join(MIGRATIONS_DIR, '001_incidents.sql'), path.join(v1Dir, '001_incidents.sql'));
    try {
      await resetDatabase(pool);
      await runMigrations(pool, { dir: v1Dir });
      await pool.query(`INSERT INTO incidents (title, description, priority, status) VALUES
        ('a', 'd', 'baja', 'abierto'), ('b', 'd', 'alta', 'en_progreso'),
        ('c', 'd', 'media', 'resuelto'), ('d', 'd', 'critica', 'cerrado')`);

      expect(await runMigrations(pool)).toEqual(['002_categoria_tecnicos_estados']);

      const { rows } = await pool.query('SELECT title, status, category, technician_id FROM incidents ORDER BY title');
      expect(rows).toEqual([
        { title: 'a', status: 'NUEVO', category: 'otro', technician_id: null },
        { title: 'b', status: 'EN_PROCESO', category: 'otro', technician_id: null },
        { title: 'c', status: 'RESUELTO', category: 'otro', technician_id: null },
        { title: 'd', status: 'CERRADO', category: 'otro', technician_id: null },
      ]);
    } finally {
      fs.rmSync(v1Dir, { recursive: true, force: true });
      await resetDatabase(pool);
      await runMigrations(pool);
    }
  });
});
