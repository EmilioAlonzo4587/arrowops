const { randomUUID } = require('node:crypto');
const { OPEN_STATUSES } = require('../models/incident');

// Mismo catalogo inicial que la migracion 002.
const DEFAULT_TECHNICIANS = ['Ana Lopez', 'Carlos Perez', 'Maria Garcia', 'Jorge Ramirez'];

// Repositorio en memoria. Los datos se pierden al reiniciar el servidor;
// se usa sin DATABASE_URL (desarrollo rapido y pruebas unitarias).
function createIncidentRepository() {
  const incidents = new Map();
  const events = new Map(); // incidentId -> eventos en orden cronologico
  let nextEventId = 1;
  const technicians = DEFAULT_TECHNICIANS.map((name, i) => ({ id: i + 1, name, active: true }));

  function technicianRef(id) {
    const tech = technicians.find((t) => t.id === id);
    return tech ? { id: tech.id, name: tech.name } : null;
  }

  function save(incident) {
    incidents.set(incident.id, incident);
    return { ...incident, technician: technicianRef(incident.technicianId) };
  }

  function view(incident) {
    return incident ? { ...incident, technician: technicianRef(incident.technicianId) } : null;
  }

  function strip({ technicianId, ...rest }) {
    return rest;
  }

  return {
    create(data) {
      const now = new Date().toISOString();
      return strip(save({
        id: randomUUID(),
        title: data.title.trim(),
        description: data.description.trim(),
        priority: data.priority,
        category: data.category,
        status: 'NUEVO',
        reporter: data.reporter ? data.reporter.trim() : null,
        technicianId: null,
        createdAt: now,
        updatedAt: now,
      }));
    },

    // Mas recientes primero; filtros opcionales. open: solo abiertos; unassigned: solo sin tecnico.
    list({ status, open, priority, category, technicianId, unassigned } = {}) {
      return [...incidents.values()]
        .filter((i) => !status || i.status === status)
        .filter((i) => !open || OPEN_STATUSES.includes(i.status))
        .filter((i) => !priority || i.priority === priority)
        .filter((i) => !category || i.category === category)
        .filter((i) => !technicianId || i.technicianId === technicianId)
        .filter((i) => !unassigned || !i.technicianId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((i) => strip(view(i)));
    },

    findById(id) {
      const found = view(incidents.get(id));
      return found ? strip(found) : null;
    },

    // Reemplaza los campos editables; el estado y el tecnico tienen operaciones propias.
    update(id, data) {
      const current = incidents.get(id);
      if (!current) return null;
      return strip(save({
        ...current,
        title: data.title.trim(),
        description: data.description.trim(),
        priority: data.priority,
        category: data.category,
        reporter: data.reporter ? data.reporter.trim() : null,
        updatedAt: new Date().toISOString(),
      }));
    },

    setAssignment(id, technicianId, status) {
      const current = incidents.get(id);
      if (!current) return null;
      return strip(save({ ...current, technicianId, status, updatedAt: new Date().toISOString() }));
    },

    setStatus(id, status) {
      const current = incidents.get(id);
      if (!current) return null;
      return strip(save({ ...current, status, updatedAt: new Date().toISOString() }));
    },

    remove(id) {
      events.delete(id);
      return incidents.delete(id);
    },

    addEvent(incidentId, { type, author = null, message = null, fromStatus = null, toStatus = null, technicianId = null }) {
      const event = {
        id: nextEventId++,
        type,
        author,
        message,
        fromStatus,
        toStatus,
        technician: technicianRef(technicianId),
        createdAt: new Date().toISOString(),
      };
      events.set(incidentId, [...(events.get(incidentId) || []), event]);
      return event;
    },

    listEvents(incidentId) {
      return events.get(incidentId) || [];
    },

    listTechnicians() {
      return technicians
        .filter((t) => t.active)
        .map((t) => ({ id: t.id, name: t.name }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    findTechnician(id) {
      return technicians.some((t) => t.id === id && t.active) ? technicianRef(id) : null;
    },
  };
}

module.exports = { createIncidentRepository };
