const request = require('supertest');
const { createApp } = require('../../backend/src/app');
const { validateIncident } = require('../../backend/src/models/incident');
const { createIncidentRepository } = require('../../backend/src/repositories/incidentRepository');

const base = {
  title: 'Servidor de archivos lento',
  description: 'Las copias tardan mas de 10 minutos.',
  priority: 'alta',
};

describe('validaciones adicionales', () => {
  test.each([null, undefined, 'texto', 42])('rechaza un cuerpo que no es objeto: %p', (body) => {
    expect(validateIncident(body)).toEqual(['El cuerpo de la peticion debe ser un objeto JSON.']);
  });

  test('rechaza una descripcion de mas de 2000 caracteres', () => {
    const errors = validateIncident({ ...base, description: 'x'.repeat(2001) });
    expect(errors).toEqual([expect.stringContaining('2000')]);
  });

  test('rechaza reporter que no es texto', () => {
    expect(validateIncident({ ...base, reporter: 123 })).toEqual(['reporter debe ser texto.']);
  });

  test('rechaza un arreglo JSON como incidente', async () => {
    const res = await request(createApp()).post('/api/incidents').send([base]);
    expect(res.status).toBe(400);
  });
});

describe('manejo de errores de la app', () => {
  test('responde 404 en rutas inexistentes', async () => {
    const res = await request(createApp()).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ errors: ['Recurso no encontrado.'] });
  });

  test('responde 500 generico sin exponer el detalle del error', async () => {
    const failing = {
      ...createIncidentRepository(),
      list() {
        throw new Error('fallo interno: conexion perdida');
      },
    };
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(createApp({ repository: failing })).get('/api/incidents');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ errors: ['Error interno del servidor.'] });
    expect(JSON.stringify(res.body)).not.toContain('conexion perdida');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('repositorio', () => {
  test('update quita el reporter si no se envia y conserva el estado', () => {
    const repo = createIncidentRepository();
    const created = repo.create({ ...base, reporter: ' soporte ', status: 'en_progreso' });
    expect(created.reporter).toBe('soporte');

    const updated = repo.update(created.id, base);
    expect(updated.reporter).toBeNull();
    expect(updated.status).toBe('en_progreso');
  });

  test('update devuelve null si el incidente no existe', () => {
    expect(createIncidentRepository().update('no-existe', base)).toBeNull();
  });
});
