const request = require('supertest');
const { createApp } = require('../../backend/src/app');

function incident(overrides = {}) {
  return {
    title: 'Correo corporativo caido',
    description: 'Outlook no sincroniza desde las 8:00.',
    priority: 'alta',
    ...overrides,
  };
}

describe('GET /api/incidents', () => {
  let app;

  beforeEach(async () => {
    app = createApp();
    await request(app).post('/api/incidents').send(incident({ title: 'A', priority: 'baja' }));
    await request(app).post('/api/incidents').send(incident({ title: 'B', status: 'resuelto' }));
    await request(app).post('/api/incidents').send(incident({ title: 'C', priority: 'critica' }));
  });

  test('lista todos los incidentes', async () => {
    const res = await request(app).get('/api/incidents');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  test('filtra por estado', async () => {
    const res = await request(app).get('/api/incidents?status=resuelto');
    expect(res.body.map((i) => i.title)).toEqual(['B']);
  });

  test('filtra por prioridad', async () => {
    const res = await request(app).get('/api/incidents?priority=critica');
    expect(res.body.map((i) => i.title)).toEqual(['C']);
  });

  test('rechaza filtros invalidos', async () => {
    const res = await request(app).get('/api/incidents?status=perdido&priority=urgente');
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveLength(2);
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
