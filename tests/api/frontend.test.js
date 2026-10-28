const request = require('supertest');
const { createApp } = require('../../backend/src/app');

describe('frontend estatico', () => {
  test('sirve la pagina principal', async () => {
    const res = await request(createApp()).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('<title>ArrowOps</title>');
  });

  test('sirve los scripts del frontend', async () => {
    const res = await request(createApp()).get('/src/app.js');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/javascript/);
  });
});
