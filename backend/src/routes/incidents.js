const express = require('express');
const { STATUSES, PRIORITIES, validateIncident } = require('../models/incident');

function createIncidentsRouter(repository) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const { status, priority } = req.query;
    const errors = [];
    if (status !== undefined && !STATUSES.includes(status)) {
      errors.push(`status debe ser uno de: ${STATUSES.join(', ')}.`);
    }
    if (priority !== undefined && !PRIORITIES.includes(priority)) {
      errors.push(`priority debe ser uno de: ${PRIORITIES.join(', ')}.`);
    }
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    return res.json(repository.list({ status, priority }));
  });

  router.get('/:id', (req, res) => {
    const incident = repository.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ errors: ['Incidente no encontrado.'] });
    }
    return res.json(incident);
  });

  router.post('/', (req, res) => {
    const errors = validateIncident(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    const incident = repository.create(req.body);
    return res.status(201).location(`/api/incidents/${incident.id}`).json(incident);
  });

  router.put('/:id', (req, res) => {
    const errors = validateIncident(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    const incident = repository.update(req.params.id, req.body);
    if (!incident) {
      return res.status(404).json({ errors: ['Incidente no encontrado.'] });
    }
    return res.json(incident);
  });

  router.delete('/:id', (req, res) => {
    if (!repository.remove(req.params.id)) {
      return res.status(404).json({ errors: ['Incidente no encontrado.'] });
    }
    return res.status(204).end();
  });

  return router;
}

module.exports = { createIncidentsRouter };
