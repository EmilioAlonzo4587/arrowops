const { randomUUID } = require('node:crypto');

// Repositorio en memoria. Los datos se pierden al reiniciar el servidor.
function createIncidentRepository() {
  const incidents = new Map();

  return {
    create(data) {
      const now = new Date().toISOString();
      const incident = {
        id: randomUUID(),
        title: data.title.trim(),
        description: data.description.trim(),
        priority: data.priority,
        status: data.status || 'abierto',
        reporter: data.reporter ? data.reporter.trim() : null,
        createdAt: now,
        updatedAt: now,
      };
      incidents.set(incident.id, incident);
      return incident;
    },
  };
}

module.exports = { createIncidentRepository };
