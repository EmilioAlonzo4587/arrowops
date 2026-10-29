const request = require('supertest');
const { createApp } = require('../../backend/src/app');
const { validateIncident } = require('../../backend/src/models/incident');

const validIncident = {
  title: 'Impresora del piso 2 sin conexion',
  description: 'La impresora no responde desde la red interna.',
  priority: 'media',
  category: 'hardware',
  reporter: 'mesa.ayuda',
};

describe('validateIncident', () => {
  test('acepta un incidente valido', () => {
    expect(validateIncident(validIncident)).toEqual([]);
  });

  test('exige title, description, priority y category', () => {
    expect(validateIncident({})).toHaveLength(4);
  });

  test('rechaza prioridad y categoria desconocidas', () => {
    const errors = validateIncident({ ...validIncident, priority: 'urgente', category: 'impresoras' });
    expect(errors).toEqual([expect.stringContaining('priority'), expect.stringContaining('category')]);
  });

  // Contrato del limite: debe coincidir con maxlength="120" de frontend/index.html (ver F-02).
  test('acepta un titulo de exactamente 120 caracteres', () => {
    expect(validateIncident({ ...validIncident, title: 'x'.repeat(120) })).toEqual([]);
  });

  test('rechaza un titulo demasiado largo', () => {
    const errors = validateIncident({ ...validIncident, title: 'x'.repeat(121) });
    expect(errors).toEqual([expect.stringContaining('120')]);
  });
});

describe('POST /api/incidents', () => {
  let app;

  beforeEach(() => {
    app = createApp();
  });

  test('crea un incidente NUEVO, sin tecnico, y responde 201', async () => {
    const res = await request(app).post('/api/incidents').send(validIncident);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: validIncident.title,
      priority: 'media',
      category: 'hardware',
      status: 'NUEVO',
      technician: null,
      reporter: 'mesa.ayuda',
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
    expect(res.headers.location).toBe(`/api/incidents/${res.body.id}`);
  });

  test('ignora status y tecnico enviados en el alta', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .send({ ...validIncident, status: 'CERRADO', technicianId: 1 });
    expect(res.body).toMatchObject({ status: 'NUEVO', technician: null });
  });

  test('responde 400 con los errores de validacion', async () => {
    const res = await request(app).post('/api/incidents').send({ title: '' });

    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  test('responde 400 ante JSON mal formado', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set('Content-Type', 'application/json')
      .send('{"title":');

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(['JSON mal formado.']);
  });
});

describe('GET /health', () => {
  test('responde ok con la version', async () => {
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', version: require('../../package.json').version });
  });
});
