// Reglas de negocio del incidente: campos, estados del proceso y transiciones validas.
const STATUSES = ['NUEVO', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'CERRADO'];
const PRIORITIES = ['baja', 'media', 'alta', 'critica'];
const CATEGORIES = ['hardware', 'software', 'red', 'accesos', 'otro'];

// Flujo del proceso. RESUELTO puede volver a EN_PROCESO si la solucion no funciono.
const TRANSITIONS = {
  NUEVO: ['ASIGNADO'],
  ASIGNADO: ['EN_PROCESO'],
  EN_PROCESO: ['RESUELTO'],
  RESUELTO: ['CERRADO', 'EN_PROCESO'],
  CERRADO: [],
};

// Estados en los que se puede asignar o reasignar un tecnico.
const ASSIGNABLE_STATUSES = ['NUEVO', 'ASIGNADO', 'EN_PROCESO'];

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 2000;

// Devuelve la lista de errores de validacion; vacia si el incidente es valido.
// El estado y el tecnico no se editan aqui: cambian por las operaciones de asignar y de estado.
function validateIncident(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
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

  if (!CATEGORIES.includes(data.category)) {
    errors.push(`category debe ser uno de: ${CATEGORIES.join(', ')}.`);
  }

  if (data.reporter !== undefined && typeof data.reporter !== 'string') {
    errors.push('reporter debe ser texto.');
  }

  return errors;
}

// Valida un cambio de estado. Devuelve el mensaje de error o null si es valido.
function checkStatusChange(incident, nextStatus) {
  if (!STATUSES.includes(nextStatus)) {
    return `status debe ser uno de: ${STATUSES.join(', ')}.`;
  }
  if (nextStatus === 'ASIGNADO') {
    return 'Para pasar a ASIGNADO hay que asignar un tecnico.';
  }
  if (!TRANSITIONS[incident.status].includes(nextStatus)) {
    const allowed = TRANSITIONS[incident.status];
    return `No se puede pasar de ${incident.status} a ${nextStatus}. ` +
      (allowed.length ? `Permitido: ${allowed.join(', ')}.` : `${incident.status} es un estado final.`);
  }
  if (!incident.technician) {
    return `Para pasar a ${nextStatus} el incidente debe tener un tecnico asignado.`;
  }
  return null;
}

// Valida una asignacion. Devuelve el mensaje de error o null si es valida.
function checkAssignment(incident) {
  if (!ASSIGNABLE_STATUSES.includes(incident.status)) {
    return `No se puede asignar un tecnico a un incidente ${incident.status}.`;
  }
  return null;
}

// Al asignar por primera vez, NUEVO pasa a ASIGNADO; en otros estados solo cambia el tecnico.
function statusAfterAssignment(incident) {
  return incident.status === 'NUEVO' ? 'ASIGNADO' : incident.status;
}

module.exports = {
  STATUSES,
  PRIORITIES,
  CATEGORIES,
  TRANSITIONS,
  validateIncident,
  checkStatusChange,
  checkAssignment,
  statusAfterAssignment,
};
