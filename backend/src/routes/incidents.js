const express = require('express');
const { validateIncident } = require('../models/incident');

function createIncidentsRouter(repository) {
  const router = express.Router();

  router.post('/', (req, res) => {
    const errors = validateIncident(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    const incident = repository.create(req.body);
    return res.status(201).location(`/api/incidents/${incident.id}`).json(incident);
  });

  return router;
}

module.exports = { createIncidentsRouter };
