const request = require('supertest');
const { createApp } = require('../../backend/src/app');
const { TRANSITIONS, STATUSES, checkStatusChange } = require('../../backend/src/models/incident');

const base = {
  title: 'Servidor de archivos sin espacio',
  description: 'Unidad compartida al 99%.',
  priority: 'critica',
  category: 'hardware',
};

async function newIncident(app) {
  return (await request(app).post('/api/incidents').send(base)).body;
}

const assign = (app, id, technicianId) =>
  request(app).patch(`/api/incidents/${id}/assign`).send({ technicianId });
const setStatus = (app, id, status) =>
  request(app).patch(`/api/incidents/${id}/status`).send({ status });

describe('flujo completo del incidente', () => {
  test('NUEVO -> ASIGNADO -> EN_PROCESO -> RESUELTO -> CERRADO', async () => {
    const app = createApp();
    const incident = await newIncident(app);

    const assigned = await assign(app, incident.id, 1);
    expect(assigned.status).toBe(200);
    expect(assigned.body).toMatchObject({ status: 'ASIGNADO', technician: { id: 1, name: 'Ana Lopez' } });

    for (const status of ['EN_PROCESO', 'RESUELTO', 'CERRADO']) {
      const res = await setStatus(app, incident.id, status);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);
    }
  });

  test('RESUELTO puede reabrirse a EN_PROCESO', async () => {
    const app = createApp();
    const incident = await newIncident(app);
    await assign(app, incident.id, 2);
    await setStatus(app, incident.id, 'EN_PROCESO');
    await setStatus(app, incident.id, 'RESUELTO');

    const res = await setStatus(app, incident.id, 'EN_PROCESO');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('EN_PROCESO');
  });
});

describe('PATCH /api/incidents/:id/assign', () => {
  let app;
  let incident;

  beforeEach(async () => {
    app = createApp();
    incident = await newIncident(app);
  });

  test('reasignar en EN_PROCESO cambia el tecnico y conserva el estado', async () => {
    await assign(app, incident.id, 1);
    await setStatus(app, incident.id, 'EN_PROCESO');

    const res = await assign(app, incident.id, 3);
    expect(res.body).toMatchObject({ status: 'EN_PROCESO', technician: { id: 3 } });
  });

  test('responde 409 al asignar un incidente RESUELTO o CERRADO', async () => {
    await assign(app, incident.id, 1);
    await setStatus(app, incident.id, 'EN_PROCESO');
    await setStatus(app, incident.id, 'RESUELTO');

    const res = await assign(app, incident.id, 2);
    expect(res.status).toBe(409);
    expect(res.body.errors[0]).toContain('RESUELTO');
  });

  test.each([undefined, 'abc', 0, -1, 1.5])('responde 400 con technicianId invalido: %p', async (technicianId) => {
    const res = await assign(app, incident.id, technicianId);
    expect(res.status).toBe(400);
  });

  test('responde 400 si el tecnico no existe', async () => {
    const res = await assign(app, incident.id, 999);
    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toContain('tecnico');
  });

  test('responde 404 si el incidente no existe', async () => {
    const res = await assign(app, 'no-existe', 1);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/incidents/:id/status', () => {
  let app;
  let incident;

  beforeEach(async () => {
    app = createApp();
    incident = await newIncident(app);
  });

  test('responde 409 al saltar pasos del flujo', async () => {
    const res = await setStatus(app, incident.id, 'RESUELTO');
    expect(res.status).toBe(409);
    expect(res.body.errors[0]).toContain('NUEVO a RESUELTO');
  });

  test('responde 409 al pasar a ASIGNADO sin asignar un tecnico', async () => {
    const res = await setStatus(app, incident.id, 'ASIGNADO');
    expect(res.status).toBe(409);
    expect(res.body.errors[0]).toContain('asignar un tecnico');
  });

  test('CERRADO es un estado final', async () => {
    await assign(app, incident.id, 1);
    for (const s of ['EN_PROCESO', 'RESUELTO', 'CERRADO']) await setStatus(app, incident.id, s);

    const res = await setStatus(app, incident.id, 'EN_PROCESO');
    expect(res.status).toBe(409);
    expect(res.body.errors[0]).toContain('estado final');
  });

  test('responde 400 con un estado desconocido (incluidos los de v1)', async () => {
    const res = await setStatus(app, incident.id, 'abierto');
    expect(res.status).toBe(400);
  });

  test('responde 404 si el incidente no existe', async () => {
    const res = await setStatus(app, 'no-existe', 'EN_PROCESO');
    expect(res.status).toBe(404);
  });
});

describe('reglas de transicion (modelo)', () => {
  test('todos los estados tienen sus transiciones definidas', () => {
    expect(Object.keys(TRANSITIONS).sort()).toEqual([...STATUSES].sort());
  });

  test('EN_PROCESO exige tecnico aunque la transicion exista (datos heredados de v1)', () => {
    const legacy = { status: 'RESUELTO', technician: null };
    expect(checkStatusChange(legacy, 'EN_PROCESO')).toContain('tecnico asignado');
  });
});
