const request = require('supertest');
const { createApp } = require('../../backend/src/app');
const { validateIncident } = require('../../backend/src/models/incident');
const { createIncidentRepository } = require('../../backend/src/repositories/incidentRepository');

const base = {
  title: 'Servidor de archivos lento',
  description: 'Las copias tardan mas de 10 minutos.',
  priority: 'alta',
  category: 'hardware',
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

describe('repositorio en memoria', () => {
  test('update quita el reporter si no se envia y conserva estado y tecnico', () => {
    const repo = createIncidentRepository();
    const created = repo.create({ ...base, reporter: ' soporte ' });
    expect(created.reporter).toBe('soporte');
    repo.setAssignment(created.id, 1, 'ASIGNADO');

    const updated = repo.update(created.id, base);
    expect(updated.reporter).toBeNull();
    expect(updated).toMatchObject({ status: 'ASIGNADO', technician: { id: 1 } });
  });

  test('las operaciones devuelven null si el incidente no existe', () => {
    const repo = createIncidentRepository();
    expect(repo.update('no-existe', base)).toBeNull();
    expect(repo.setAssignment('no-existe', 1, 'ASIGNADO')).toBeNull();
    expect(repo.setStatus('no-existe', 'EN_PROCESO')).toBeNull();
  });

  test('findTechnician devuelve null si no existe', () => {
    expect(createIncidentRepository().findTechnician(999)).toBeNull();
  });
});