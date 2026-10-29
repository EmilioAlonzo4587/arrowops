// Indicadores del dashboard calculados a partir de la lista de incidentes.
// Funcion pura: la usan ambos repositorios y se prueba sin base de datos.
const { STATUSES, CATEGORIES } = require('./incident');

const OPEN_STATUSES = ['NUEVO', 'ASIGNADO', 'EN_PROCESO'];
const UNASSIGNED = 'Sin asignar';

function countBy(items, keyOf, keys = []) {
  const counts = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const item of items) {
    const key = keyOf(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function computeStats(incidents) {
  const open = incidents.filter((i) => OPEN_STATUSES.includes(i.status));
  return {
    total: incidents.length,
    // Abiertos: todavia requieren trabajo (NUEVO, ASIGNADO o EN_PROCESO).
    abiertos: open.length,
    resueltos: incidents.filter((i) => i.status === 'RESUELTO').length,
    cerrados: incidents.filter((i) => i.status === 'CERRADO').length,
    // Criticos: prioridad critica que aun no se resuelve.
    criticos: open.filter((i) => i.priority === 'critica').length,
    porEstado: countBy(incidents, (i) => i.status, STATUSES),
    porCategoria: countBy(incidents, (i) => i.category, CATEGORIES),
    // Carga de trabajo: incidentes abiertos por tecnico.
    porTecnico: countBy(open, (i) => (i.technician ? i.technician.name : UNASSIGNED)),
  };
}

module.exports = { computeStats, OPEN_STATUSES, UNASSIGNED };
