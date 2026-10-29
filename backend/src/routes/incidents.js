const express = require('express');
const {
  STATUSES,
  PRIORITIES,
  CATEGORIES,
  validateIncident,
  validateComment,
  authorOf,
  checkStatusChange,
  checkAssignment,
  statusAfterAssignment,
} = require('../models/incident');
const { computeStats } = require('../models/stats');

const NOT_FOUND = { errors: ['Incidente no encontrado.'] };

function parseTechnicianId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Los handlers son async: el repositorio puede ser en memoria (sincrono) o PostgreSQL.
// Express 5 envia las promesas rechazadas al manejador de errores (500) sin try/catch.
function createIncidentsRouter(repository) {
  const router = express.Router();

  // Filtros: status, priority, category, technicianId (id o "none" = sin asignar)
  // y open=true (NUEVO, ASIGNADO o EN_PROCESO), que usa el dashboard.
  router.get('/', async (req, res) => {
    const { status, open, priority, category, technicianId } = req.query;
    const unassigned = technicianId === 'none';
    const errors = [];
    if (status !== undefined && !STATUSES.includes(status)) {
      errors.push(`status debe ser uno de: ${STATUSES.join(', ')}.`);
    }
    if (open !== undefined && open !== 'true' && open !== 'false') {
      errors.push('open debe ser true o false.');
    }
    if (priority !== undefined && !PRIORITIES.includes(priority)) {
      errors.push(`priority debe ser uno de: ${PRIORITIES.join(', ')}.`);
    }
    if (category !== undefined && !CATEGORIES.includes(category)) {
      errors.push(`category debe ser uno de: ${CATEGORIES.join(', ')}.`);
    }
    if (technicianId !== undefined && !unassigned && !parseTechnicianId(technicianId)) {
      errors.push('technicianId debe ser un entero positivo o none.');
    }
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    return res.json(await repository.list({
      status,
      open: open === 'true',
      priority,
      category,
      technicianId: technicianId !== undefined && !unassigned ? parseTechnicianId(technicianId) : undefined,
      unassigned,
    }));
  });

  router.get('/:id', async (req, res) => {
    const incident = await repository.findById(req.params.id);
    if (!incident) return res.status(404).json(NOT_FOUND);
    return res.json(incident);
  });

  // Todo incidente nace en estado NUEVO y sin tecnico.
  router.post('/', async (req, res) => {
    const errors = validateIncident(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });
    const incident = await repository.create(req.body);
    await repository.addEvent(incident.id, { type: 'creado', author: incident.reporter, toStatus: incident.status });
    return res.status(201).location(`/api/incidents/${incident.id}`).json(incident);
  });

  // Edita los datos del incidente; el estado y el tecnico cambian con sus propias operaciones.
  router.put('/:id', async (req, res) => {
    const errors = validateIncident(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });
    const incident = await repository.update(req.params.id, req.body);
    if (!incident) return res.status(404).json(NOT_FOUND);
    await repository.addEvent(incident.id, { type: 'editado', author: authorOf(req.body) });
    return res.json(incident);
  });

  // Asignar (o reasignar) un tecnico. Un incidente NUEVO pasa a ASIGNADO.
  router.patch('/:id/assign', async (req, res) => {
    const technicianId = parseTechnicianId(req.body && req.body.technicianId);
    if (!technicianId) {
      return res.status(400).json({ errors: ['technicianId debe ser un entero positivo.'] });
    }
    const incident = await repository.findById(req.params.id);
    if (!incident) return res.status(404).json(NOT_FOUND);
    if (!(await repository.findTechnician(technicianId))) {
      return res.status(400).json({ errors: ['El tecnico no existe o no esta activo.'] });
    }
    const conflict = checkAssignment(incident);
    if (conflict) return res.status(409).json({ errors: [conflict] });
    const updated = await repository.setAssignment(incident.id, technicianId, statusAfterAssignment(incident));
    await repository.addEvent(incident.id, {
      type: 'asignado',
      author: authorOf(req.body),
      technicianId,
      fromStatus: incident.status,
      toStatus: updated.status,
      message: incident.technician
        ? `Reasignado de ${incident.technician.name} a ${updated.technician.name}`
        : `Asignado a ${updated.technician.name}`,
    });
    return res.json(updated);
  });

  // Cambiar el estado respetando el flujo NUEVO -> ASIGNADO -> EN_PROCESO -> RESUELTO -> CERRADO.
  router.patch('/:id/status', async (req, res) => {
    const status = req.body && req.body.status;
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ errors: [`status debe ser uno de: ${STATUSES.join(', ')}.`] });
    }
    const incident = await repository.findById(req.params.id);
    if (!incident) return res.status(404).json(NOT_FOUND);
    const conflict = checkStatusChange(incident, status);
    if (conflict) return res.status(409).json({ errors: [conflict] });
    const updated = await repository.setStatus(incident.id, status);
    await repository.addEvent(incident.id, {
      type: 'estado',
      author: authorOf(req.body),
      fromStatus: incident.status,
      toStatus: status,
    });
    return res.json(updated);
  });

  // Bitacora: comentarios y eventos automaticos, en orden cronologico.
  router.get('/:id/history', async (req, res) => {
    const incident = await repository.findById(req.params.id);
    if (!incident) return res.status(404).json(NOT_FOUND);
    return res.json(await repository.listEvents(incident.id));
  });

  router.post('/:id/comments', async (req, res) => {
    const errors = validateComment(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });
    const incident = await repository.findById(req.params.id);
    if (!incident) return res.status(404).json(NOT_FOUND);
    const event = await repository.addEvent(incident.id, {
      type: 'comentario',
      author: authorOf(req.body),
      message: req.body.message.trim(),
    });
    return res.status(201).json(event);
  });

  router.delete('/:id', async (req, res) => {
    if (!(await repository.remove(req.params.id))) return res.status(404).json(NOT_FOUND);
    return res.status(204).end();
  });

  return router;
}

function createTechniciansRouter(repository) {
  const router = express.Router();
  router.get('/', async (req, res) => res.json(await repository.listTechnicians()));
  return router;
}

// Indicadores del dashboard sobre todos los incidentes.
function createStatsRouter(repository) {
  const router = express.Router();
  router.get('/', async (req, res) => res.json(computeStats(await repository.list())));
  return router;
}

module.exports = { createIncidentsRouter, createTechniciansRouter, createStatsRouter };
