const express = require('express');
const {
  STATUSES,
  PRIORITIES,
  CATEGORIES,
  validateIncident,
  checkStatusChange,
  checkAssignment,
  statusAfterAssignment,
} = require('../models/incident');

const NOT_FOUND = { errors: ['Incidente no encontrado.'] };

function parseTechnicianId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Los handlers son async: el repositorio puede ser en memoria (sincrono) o PostgreSQL.
// Express 5 envia las promesas rechazadas al manejador de errores (500) sin try/catch.
function createIncidentsRouter(repository) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const { status, priority, category, technicianId } = req.query;
    const errors = [];
    if (status !== undefined && !STATUSES.includes(status)) {
      errors.push(`status debe ser uno de: ${STATUSES.join(', ')}.`);
    }
    if (priority !== undefined && !PRIORITIES.includes(priority)) {
      errors.push(`priority debe ser uno de: ${PRIORITIES.join(', ')}.`);
    }
    if (category !== undefined && !CATEGORIES.includes(category)) {
      errors.push(`category debe ser uno de: ${CATEGORIES.join(', ')}.`);
    }
    if (technicianId !== undefined && !parseTechnicianId(technicianId)) {
      errors.push('technicianId debe ser un entero positivo.');
    }
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    return res.json(await repository.list({
      status,
      priority,
      category,
      technicianId: technicianId !== undefined ? parseTechnicianId(technicianId) : undefined,
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
    return res.status(201).location(`/api/incidents/${incident.id}`).json(incident);
  });

  // Edita los datos del incidente; el estado y el tecnico cambian con sus propias operaciones.
  router.put('/:id', async (req, res) => {
    const errors = validateIncident(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });
    const incident = await repository.update(req.params.id, req.body);
    if (!incident) return res.status(404).json(NOT_FOUND);
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
    return res.json(await repository.setAssignment(incident.id, technicianId, statusAfterAssignment(incident)));
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
    return res.json(await repository.setStatus(incident.id, status));
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

module.exports = { createIncidentsRouter, createTechniciansRouter };
