// Indicadores del dashboard calculados a partir de la lista de incidentes.
// Funcion pura: la usan ambos repositorios y se prueba sin base de datos.
const { STATUSES, CATEGORIES, OPEN_STATUSES } = require('./incident');

const UNASSIGNED = 'Sin asignar';

function countBy(items, keyOf, keys = []) {
  const counts = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const item of items) {
    const key = keyOf(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

// technicians: catalogo activo [{id, name}]. Todos aparecen en porTecnico aunque tengan 0
// abiertos, para que el dashboard muestre tambien a quien no tiene carga.
function computeStats(incidents, technicians = []) {
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
    // Carga de trabajo: incidentes abiertos por tecnico, mas los abiertos sin tecnico (UNASSIGNED).
    porTecnico: countBy(
      open,
      (i) => (i.technician ? i.technician.name : UNASSIGNED),
      [...technicians.map((t) => t.name), UNASSIGNED],
    ),
  };
}

module.exports = { computeStats, OPEN_STATUSES, UNASSIGNED };
