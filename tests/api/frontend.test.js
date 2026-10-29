const request = require('supertest');
const { createApp } = require('../../backend/src/app');

describe('frontend estatico', () => {
  test('sirve la pagina principal', async () => {
    const res = await request(createApp()).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('<title>ArrowOps</title>');
  });

  test('las tarjetas del dashboard son botones que filtran la lista', async () => {
    const res = await request(createApp()).get('/');
    expect(res.text).toContain(`data-filters='{"status":"open"}'`);
    expect(res.text).toContain(`data-filters='{"status":"open","priority":"critica"}'`);
    expect(res.text).toContain('<option value="none">Sin asignar</option>');
  });

  test('sirve los scripts del frontend', async () => {
    const res = await request(createApp()).get('/src/app.js');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/javascript/);
  });
});
