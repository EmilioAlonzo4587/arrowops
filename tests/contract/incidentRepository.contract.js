// Contrato comun de los repositorios de incidentes.
// Cualquier implementacion (memoria, PostgreSQL) debe pasar exactamente estas pruebas.
const base = {
  title: '  Switch del piso 3 sin energia  ',
  description: 'Los equipos del ala norte no tienen red.',
  priority: 'critica',
  category: 'red',
};
const MISSING = '00000000-0000-4000-8000-000000000000';

function describeIncidentRepositoryContract(name, getRepository) {
  describe(`contrato del repositorio: ${name}`, () => {
    let repo;
    let techA;
    let techB;

    beforeEach(async () => {
      repo = await getRepository();
      [techA, techB] = await repo.listTechnicians();
    });

    test('create recorta textos, nace NUEVO sin tecnico y genera id y fechas', async () => {
      const created = await repo.create({ ...base, reporter: ' noc ' });
      expect(created).toMatchObject({
        title: 'Switch del piso 3 sin energia',
        category: 'red',
        status: 'NUEVO',
        technician: null,
        reporter: 'noc',
      });
      expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(new Date(created.createdAt).toISOString()).toBe(created.createdAt);
    });

    test('findById devuelve el incidente o null', async () => {
      const created = await repo.create(base);
      expect(await repo.findById(created.id)).toEqual(created);
      expect(await repo.findById(MISSING)).toBeNull();
      expect(await repo.findById('no-es-un-uuid')).toBeNull();
    });

    test('list filtra por estado, prioridad, categoria y tecnico', async () => {
      await repo.create({ ...base, priority: 'baja', category: 'software' });
      const assigned = await repo.create(base);
      await repo.setAssignment(assigned.id, techA.id, 'ASIGNADO');

      expect(await repo.list()).toHaveLength(2);
      expect((await repo.list({ priority: 'baja' })).map((i) => i.priority)).toEqual(['baja']);
      expect((await repo.list({ category: 'software' })).map((i) => i.category)).toEqual(['software']);
      expect((await repo.list({ status: 'ASIGNADO' })).map((i) => i.id)).toEqual([assigned.id]);
      expect((await repo.list({ technicianId: techA.id })).map((i) => i.id)).toEqual([assigned.id]);
      expect(await repo.list({ technicianId: techB.id })).toEqual([]);
    });

    test('update edita los datos y conserva estado y tecnico', async () => {
      const created = await repo.create({ ...base, reporter: 'noc' });
      await repo.setAssignment(created.id, techA.id, 'ASIGNADO');
      const updated = await repo.update(created.id, { ...base, priority: 'alta', category: 'hardware' });

      expect(updated).toMatchObject({
        id: created.id,
        priority: 'alta',
        category: 'hardware',
        status: 'ASIGNADO',
        technician: { id: techA.id, name: techA.name },
        reporter: null,
      });
      expect(updated.createdAt).toBe(created.createdAt);
      expect(await repo.update(MISSING, base)).toBeNull();
      expect(await repo.update('no-es-un-uuid', base)).toBeNull();
    });

    test('setAssignment y setStatus actualizan el incidente', async () => {
      const created = await repo.create(base);
      const assigned = await repo.setAssignment(created.id, techB.id, 'ASIGNADO');
      expect(assigned).toMatchObject({ status: 'ASIGNADO', technician: { id: techB.id, name: techB.name } });

      const inProgress = await repo.setStatus(created.id, 'EN_PROCESO');
      expect(inProgress).toMatchObject({ status: 'EN_PROCESO', technician: { id: techB.id } });

      expect(await repo.setAssignment(MISSING, techA.id, 'ASIGNADO')).toBeNull();
      expect(await repo.setStatus('no-es-un-uuid', 'EN_PROCESO')).toBeNull();
    });

    test('remove elimina y devuelve false si no existe', async () => {
      const created = await repo.create(base);
      expect(await repo.remove(created.id)).toBe(true);
      expect(await repo.findById(created.id)).toBeNull();
      expect(await repo.remove(created.id)).toBe(false);
      expect(await repo.remove('no-es-un-uuid')).toBe(false);
    });

    test('bitacora: addEvent y listEvents en orden cronologico; remove borra el historial', async () => {
      const created = await repo.create(base);
      const first = await repo.addEvent(created.id, { type: 'creado', author: 'noc', toStatus: 'NUEVO' });
      await repo.addEvent(created.id, { type: 'asignado', technicianId: techA.id, fromStatus: 'NUEVO', toStatus: 'ASIGNADO' });
      await repo.addEvent(created.id, { type: 'comentario', message: 'Revisando' });

      expect(first).toMatchObject({ type: 'creado', author: 'noc', message: null, toStatus: 'NUEVO', technician: null });
      expect(first.id).toEqual(expect.any(Number));
      const events = await repo.listEvents(created.id);
      expect(events.map((e) => e.type)).toEqual(['creado', 'asignado', 'comentario']);
      expect(events[1].technician).toEqual({ id: techA.id, name: techA.name });
      expect(await repo.listEvents('no-es-un-uuid')).toEqual([]);

      await repo.remove(created.id);
      expect(await repo.listEvents(created.id)).toEqual([]);
    });

    test('catalogo de tecnicos ordenado por nombre', async () => {
      const technicians = await repo.listTechnicians();
      expect(technicians.map((t) => t.name)).toEqual(['Ana Lopez', 'Carlos Perez', 'Jorge Ramirez', 'Maria Garcia']);
      expect(await repo.findTechnician(techA.id)).toEqual(techA);
      expect(await repo.findTechnician(999999)).toBeNull();
    });
  });
}

module.exports = { describeIncidentRepositoryContract };
