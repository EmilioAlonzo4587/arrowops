const request = require('supertest');
const { createApp } = require('../../backend/src/app');

function incident(overrides = {}) {
  return {
    title: 'Correo corporativo caido',
    description: 'Outlook no sincroniza desde las 8:00.',
    priority: 'alta',
    category: 'software',
    ...overrides,
  };
}

describe('GET /api/incidents', () => {
  let app;

  beforeEach(async () => {
    app = createApp();
    await request(app).post('/api/incidents').send(incident({ title: 'A', priority: 'baja', category: 'red' }));
    const b = await request(app).post('/api/incidents').send(incident({ title: 'B' }));
    await request(app).post('/api/incidents').send(incident({ title: 'C', priority: 'critica', category: 'hardware' }));
    await request(app).patch(`/api/incidents/${b.body.id}/assign`).send({ technicianId: 2 });
  });

  test('lista todos los incidentes', async () => {
    const res = await request(app).get('/api/incidents');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  test('filtra por estado', async () => {
    const res = await request(app).get('/api/incidents?status=ASIGNADO');
    expect(res.body.map((i) => i.title)).toEqual(['B']);
  });

  test('filtra por prioridad', async () => {
    const res = await request(app).get('/api/incidents?priority=critica');
    expect(res.body.map((i) => i.title)).toEqual(['C']);
  });

  test('filtra por categoria', async () => {
    const res = await request(app).get('/api/incidents?category=red');
    expect(res.body.map((i) => i.title)).toEqual(['A']);
  });

  test('filtra por tecnico', async () => {
    const res = await request(app).get('/api/incidents?technicianId=2');
    expect(res.body.map((i) => i.title)).toEqual(['B']);
  });

  test('filtra abiertos (NUEVO, ASIGNADO o EN_PROCESO)', async () => {
    const all = (await request(app).get('/api/incidents')).body;
    const c = all.find((i) => i.title === 'C');
    await request(app).patch(`/api/incidents/${c.id}/assign`).send({ technicianId: 1 });
    for (const status of ['EN_PROCESO', 'RESUELTO']) {
      await request(app).patch(`/api/incidents/${c.id}/status`).send({ status });
    }

    const res = await request(app).get('/api/incidents?open=true');
    expect(res.body.map((i) => i.title).sort()).toEqual(['A', 'B']);
    expect((await request(app).get('/api/incidents?open=false')).body).toHaveLength(3);
  });

  test('filtra incidentes sin tecnico con technicianId=none', async () => {
    const res = await request(app).get('/api/incidents?technicianId=none');
    expect(res.body.map((i) => i.title).sort()).toEqual(['A', 'C']);
  });

  test('combina abiertos con prioridad, como la tarjeta de criticos', async () => {
    const res = await request(app).get('/api/incidents?open=true&priority=critica');
    expect(res.body.map((i) => i.title)).toEqual(['C']);
  });

  test('combina filtros', async () => {
    const res = await request(app).get('/api/incidents?category=software&status=NUEVO');
    expect(res.body).toEqual([]);
  });

  test('rechaza filtros invalidos', async () => {
    const res = await request(app)
      .get('/api/incidents?status=abierto&open=si&priority=urgente&category=x&technicianId=abc');
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveLength(5);
  });
});

describe('GET /api/incidents/:id', () => {
  test('devuelve el incidente existente', async () => {
    const app = createApp();
    const created = await request(app).post('/api/incidents').send(incident());

    const res = await request(app).get(`/api/incidents/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(created.body);
  });

  test('responde 404 si no existe', async () => {
    const res = await request(createApp()).get('/api/incidents/no-existe');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/technicians', () => {
  test('lista los tecnicos activos ordenados por nombre', async () => {
    const res = await request(createApp()).get('/api/technicians');
    expect(res.status).toBe(200);
    expect(res.body.map((t) => t.name)).toEqual(['Ana Lopez', 'Carlos Perez', 'Jorge Ramirez', 'Maria Garcia']);
    expect(res.body[0]).toEqual({ id: expect.any(Number), name: 'Ana Lopez' });
  });
});

describe('GET /api/meta', () => {
  test('expone los catalogos y el flujo de estados del modelo', async () => {
    const res = await request(createApp()).get('/api/meta');
    expect(res.status).toBe(200);
    expect(res.body.statuses).toEqual(['NUEVO', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'CERRADO']);
    expect(res.body.categories).toContain('hardware');
    expect(res.body.transitions.RESUELTO).toEqual(['CERRADO', 'EN_PROCESO']);
  });
});