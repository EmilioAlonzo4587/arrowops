const request = require('supertest');
const { createApp } = require('../../backend/src/app');

const base = {
  title: 'VPN no conecta',
  description: 'Error de autenticacion al conectar desde casa.',
  priority: 'media',
  category: 'accesos',
};

describe('PUT /api/incidents/:id', () => {
  let app;
  let created;

  beforeEach(async () => {
    app = createApp();
    created = (await request(app).post('/api/incidents').send(base)).body;
  });

  test('actualiza los datos y conserva id, createdAt y estado', async () => {
    const res = await request(app)
      .put(`/api/incidents/${created.id}`)
      .send({ ...base, priority: 'alta', category: 'red' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: created.id,
      createdAt: created.createdAt,
      priority: 'alta',
      category: 'red',
      status: 'NUEVO',
    });
    expect(res.body.updatedAt >= created.updatedAt).toBe(true);
  });

  test('no cambia el estado aunque se envie (usa PATCH /status)', async () => {
    const res = await request(app).put(`/api/incidents/${created.id}`).send({ ...base, status: 'CERRADO' });
    expect(res.body.status).toBe('NUEVO');
  });

  test('responde 400 si los datos no son validos', async () => {
    const res = await request(app).put(`/api/incidents/${created.id}`).send({ title: 'x' });
    expect(res.status).toBe(400);
  });

  test('responde 404 si no existe', async () => {
    const res = await request(app).put('/api/incidents/no-existe').send(base);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/incidents/:id', () => {
  test('elimina el incidente y responde 204', async () => {
    const app = createApp();
    const created = (await request(app).post('/api/incidents').send(base)).body;

    const res = await request(app).delete(`/api/incidents/${created.id}`);
    expect(res.status).toBe(204);

    const after = await request(app).get(`/api/incidents/${created.id}`);
    expect(after.status).toBe(404);
  });

  test('responde 404 si no existe', async () => {
    const res = await request(createApp()).delete('/api/incidents/no-existe');
    expect(res.status).toBe(404);
  });
});
