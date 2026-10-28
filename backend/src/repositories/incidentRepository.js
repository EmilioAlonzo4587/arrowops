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

    // Mas recientes primero; filtros opcionales por estado y prioridad.
    list({ status, priority } = {}) {
      return [...incidents.values()]
        .filter((i) => !status || i.status === status)
        .filter((i) => !priority || i.priority === priority)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    findById(id) {
      return incidents.get(id) || null;
    },

    // Reemplaza los campos editables; conserva id y createdAt.
    update(id, data) {
      const current = incidents.get(id);
      if (!current) return null;
      const updated = {
        ...current,
        title: data.title.trim(),
        description: data.description.trim(),
        priority: data.priority,
        status: data.status || current.status,
        reporter: data.reporter ? data.reporter.trim() : null,
        updatedAt: new Date().toISOString(),
      };
      incidents.set(id, updated);
      return updated;
    },

    remove(id) {
      return incidents.delete(id);
    },
  };
}

module.exports = { createIncidentRepository };
