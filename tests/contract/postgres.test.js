// Pruebas de integracion contra PostgreSQL real. Requieren DATABASE_URL;
// en CI la definen GitHub Actions (servicio postgres) y Azure Pipelines (docker compose).
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const request = require('supertest');
const { createApp } = require('../../backend/src/app');
const { createPostgresIncidentRepository } = require('../../backend/src/repositories/postgresIncidentRepository');
const { describeIncidentRepositoryContract } = require('./incidentRepository.contract');

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('PostgreSQL', () => {
  let pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
    // El esquema es idempotente: sirve tanto para una base nueva como para la de docker compose.
    await pool.query(fs.readFileSync(path.join(__dirname, '../../database/schema.sql'), 'utf8'));
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
    const incident = { title: 'Disco lleno', description: 'Servidor de logs al 99%.', priority: 'alta' };

    const created = await request(app).post('/api/incidents').send(incident);
    expect(created.status).toBe(201);

    const list = await request(app).get('/api/incidents?priority=alta');
    expect(list.body.map((i) => i.id)).toEqual([created.body.id]);

    const deleted = await request(app).delete(`/api/incidents/${created.body.id}`);
    expect(deleted.status).toBe(204);
  });

  test('la base de datos rechaza valores fuera del esquema', async () => {
    await expect(
      pool.query("INSERT INTO incidents (title, description, priority) VALUES ('t', 'd', 'urgente')"),
    ).rejects.toThrow(/check constraint/);
  });
});
