const path = require('node:path');
const express = require('express');
const { createIncidentRepository } = require('./repositories/incidentRepository');
const { createIncidentsRouter } = require('./routes/incidents');
const { version: packageVersion } = require('../../package.json');

function createApp({ repository = createIncidentRepository(), version = packageVersion } = {}) {
  const app = express();

  app.use(express.json());

  // La version permite al pipeline verificar que el ambiente corre la version esperada.
  app.get('/health', (req, res) => res.json({ status: 'ok', version }));
  app.use('/api/incidents', createIncidentsRouter(repository));
  app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

  app.use((req, res) => res.status(404).json({ errors: ['Recurso no encontrado.'] }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ errors: ['JSON mal formado.'] });
    }
    console.error(err);
    return res.status(500).json({ errors: ['Error interno del servidor.'] });
  });

  return app;
}

module.exports = { createApp };
