const STATUSES = ['abierto', 'en_progreso', 'resuelto', 'cerrado'];
const PRIORITIES = ['baja', 'media', 'alta', 'critica'];

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 2000;

// Devuelve la lista de errores de validacion; vacia si el incidente es valido.
function validateIncident(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return ['El cuerpo de la peticion debe ser un objeto JSON.'];
  }

  if (typeof data.title !== 'string' || data.title.trim() === '') {
    errors.push('title es obligatorio.');
  } else if (data.title.trim().length > TITLE_MAX) {
    errors.push(`title no puede superar ${TITLE_MAX} caracteres.`);
  }

  if (typeof data.description !== 'string' || data.description.trim() === '') {
    errors.push('description es obligatorio.');
  } else if (data.description.trim().length > DESCRIPTION_MAX) {
    errors.push(`description no puede superar ${DESCRIPTION_MAX} caracteres.`);
  }

  if (!PRIORITIES.includes(data.priority)) {
    errors.push(`priority debe ser uno de: ${PRIORITIES.join(', ')}.`);
  }

  if (data.status !== undefined && !STATUSES.includes(data.status)) {
    errors.push(`status debe ser uno de: ${STATUSES.join(', ')}.`);
  }

  if (data.reporter !== undefined && typeof data.reporter !== 'string') {
    errors.push('reporter debe ser texto.');
  }

  return errors;
}

module.exports = { STATUSES, PRIORITIES, validateIncident };
