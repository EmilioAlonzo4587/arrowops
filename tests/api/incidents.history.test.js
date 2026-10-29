const request = require('supertest');
const { createApp } = require('../../backend/src/app');
const { computeStats } = require('../../backend/src/models/stats');

const base = {
  title: 'Correo corporativo caido',
  description: 'Outlook no sincroniza.',
  priority: 'critica',
  category: 'software',
  reporter: 'soporte.n2',
};

describe('bitacora del incidente', () => {
  let app;
  let incident;

  beforeEach(async () => {
    app = createApp();
    incident = (await request(app).post('/api/incidents').send(base)).body;
  });

  const history = async () => (await request(app).get(`/api/incidents/${incident.id}/history`)).body;

  test('el alta registra el evento de creacion', async () => {
    expect(await history()).toEqual([
      expect.objectContaining({ type: 'creado', author: 'soporte.n2', toStatus: 'NUEVO' }),
    ]);
  });

  test('asignar, reasignar, cambiar estado y editar quedan en el historial en orden', async () => {
    await request(app).patch(`/api/incidents/${incident.id}/assign`).send({ technicianId: 1, author: 'coordinador' });
    await request(app).patch(`/api/incidents/${incident.id}/status`).send({ status: 'EN_PROCESO', author: 'Ana' });
    await request(app).patch(`/api/incidents/${incident.id}/assign`).send({ technicianId: 2 });
    await request(app).put(`/api/incidents/${incident.id}`).send({ ...base, priority: 'alta' });

    const events = await history();
    expect(events.map((e) => e.type)).toEqual(['creado', 'asignado', 'estado', 'asignado', 'editado']);
    expect(events[1]).toMatchObject({
      author: 'coordinador',
      fromStatus: 'NUEVO',
      toStatus: 'ASIGNADO',
      technician: { id: 1, name: 'Ana Lopez' },
      message: 'Asignado a Ana Lopez',
    });
    expect(events[2]).toMatchObject({ author: 'Ana', fromStatus: 'ASIGNADO', toStatus: 'EN_PROCESO' });
    expect(events[3]).toMatchObject({ message: 'Reasignado de Ana Lopez a Carlos Perez', author: null });
  });

  test('las operaciones rechazadas no se registran', async () => {
    await request(app).patch(`/api/incidents/${incident.id}/status`).send({ status: 'CERRADO' });
    expect(await history()).toHaveLength(1);
  });

  test('POST /comments agrega un comentario y responde 201', async () => {
    const res = await request(app)
      .post(`/api/incidents/${incident.id}/comments`)
      .send({ author: ' Ana Lopez ', message: '  Reinicie el servicio de Exchange.  ' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ type: 'comentario', author: 'Ana Lopez', message: 'Reinicie el servicio de Exchange.' });
    expect((await history()).map((e) => e.type)).toEqual(['creado', 'comentario']);
  });

  test.each([
    [{}, 'message es obligatorio'],
    [{ message: '   ' }, 'message es obligatorio'],
    [{ message: 'x'.repeat(1001) }, '1000'],
    [{ message: 'ok', author: 5 }, 'author'],
  ])('rechaza comentarios invalidos: %p', async (body, error) => {
    const res = await request(app).post(`/api/incidents/${incident.id}/comments`).send(body);
    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toContain(error);
  });

  test('rechaza un arreglo como comentario', async () => {
    const res = await request(app).post(`/api/incidents/${incident.id}/comments`).send(['hola']);
    expect(res.status).toBe(400);
  });

  test('responde 404 si el incidente no existe', async () => {
    expect((await request(app).get('/api/incidents/no-existe/history')).status).toBe(404);
    expect((await request(app).post('/api/incidents/no-existe/comments').send({ message: 'x' })).status).toBe(404);
  });

  test('eliminar el incidente elimina su historial', async () => {
    await request(app).delete(`/api/incidents/${incident.id}`);
    expect((await request(app).get(`/api/incidents/${incident.id}/history`)).status).toBe(404);
  });
});

describe('GET /api/stats', () => {
  test('calcula abiertos, cerrados, criticos y distribuciones', async () => {
    const app = createApp();
    const create = async (extra) => (await request(app).post('/api/incidents').send({ ...base, ...extra })).body;
    const flow = async (id, technicianId, statuses) => {
      await request(app).patch(`/api/incidents/${id}/assign`).send({ technicianId });
      for (const status of statuses) await request(app).patch(`/api/incidents/${id}/status`).send({ status });
    };

    await create({ priority: 'critica', category: 'red' }); // NUEVO, sin asignar
    const b = await create({ priority: 'critica', category: 'software' });
    await flow(b.id, 1, ['EN_PROCESO']); // abierto, critico, Ana
    const c = await create({ priority: 'critica', category: 'software' });
    await flow(c.id, 1, ['EN_PROCESO', 'RESUELTO', 'CERRADO']); // cerrado: no cuenta como critico
    const d = await create({ priority: 'baja', category: 'hardware' });
    await flow(d.id, 2, ['EN_PROCESO', 'RESUELTO']); // resuelto

    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      total: 4,
      abiertos: 2,
      resueltos: 1,
      cerrados: 1,
      criticos: 2,
      porEstado: { NUEVO: 1, ASIGNADO: 0, EN_PROCESO: 1, RESUELTO: 1, CERRADO: 1 },
      porCategoria: { hardware: 1, software: 2, red: 1, accesos: 0, otro: 0 },
      porTecnico: { 'Sin asignar': 1, 'Ana Lopez': 1 },
    });
  });

  test('sin incidentes devuelve ceros', () => {
    expect(computeStats([])).toMatchObject({ total: 0, abiertos: 0, cerrados: 0, criticos: 0, porTecnico: {} });
  });
});
