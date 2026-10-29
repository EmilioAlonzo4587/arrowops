// Contrato comun de los repositorios de incidentes.
// Cualquier implementacion (memoria, PostgreSQL) debe pasar exactamente estas pruebas.
const base = {
  title: '  Switch del piso 3 sin energia  ',
  description: 'Los equipos del ala norte no tienen red.',
  priority: 'critica',
};

function describeIncidentRepositoryContract(name, getRepository) {
  describe(`contrato del repositorio: ${name}`, () => {
    let repo;

    beforeEach(async () => {
      repo = await getRepository();
    });

    test('create recorta textos, aplica estado por defecto y genera id y fechas', async () => {
      const created = await repo.create({ ...base, reporter: ' noc ' });
      expect(created).toMatchObject({
        title: 'Switch del piso 3 sin energia',
        status: 'abierto',
        reporter: 'noc',
      });
      expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(new Date(created.createdAt).toISOString()).toBe(created.createdAt);
    });

    test('findById devuelve el incidente o null', async () => {
      const created = await repo.create(base);
      expect(await repo.findById(created.id)).toEqual(created);
      expect(await repo.findById('00000000-0000-4000-8000-000000000000')).toBeNull();
      expect(await repo.findById('no-es-un-uuid')).toBeNull();
    });

    test('list filtra por estado y prioridad', async () => {
      await repo.create({ ...base, priority: 'baja' });
      await repo.create({ ...base, status: 'resuelto' });

      expect(await repo.list()).toHaveLength(2);
      expect((await repo.list({ priority: 'baja' })).map((i) => i.priority)).toEqual(['baja']);
      expect((await repo.list({ status: 'resuelto' })).map((i) => i.status)).toEqual(['resuelto']);
    });

    test('update reemplaza campos, conserva estado si no se envia y quita reporter', async () => {
      const created = await repo.create({ ...base, status: 'en_progreso', reporter: 'noc' });
      const updated = await repo.update(created.id, { ...base, priority: 'alta' });

      expect(updated).toMatchObject({ id: created.id, priority: 'alta', status: 'en_progreso', reporter: null });
      expect(updated.createdAt).toBe(created.createdAt);
      expect(await repo.update('00000000-0000-4000-8000-000000000000', base)).toBeNull();
      expect(await repo.update('no-es-un-uuid', base)).toBeNull();
    });

    test('remove elimina y devuelve false si no existe', async () => {
      const created = await repo.create(base);
      expect(await repo.remove(created.id)).toBe(true);
      expect(await repo.findById(created.id)).toBeNull();
      expect(await repo.remove(created.id)).toBe(false);
      expect(await repo.remove('no-es-un-uuid')).toBe(false);
    });
  });
}

module.exports = { describeIncidentRepositoryContract };
