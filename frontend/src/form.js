// Lectura, validacion y llenado del formulario de incidentes.
const incidentForm = {
  el: document.getElementById('incident-form'),
  fields: ['title', 'description', 'priority', 'category', 'reporter'],

  read() {
    const data = {};
    this.fields.forEach((name) => {
      data[name] = document.getElementById(name).value.trim();
    });
    if (!data.reporter) delete data.reporter;
    return data;
  },

  // Mismas reglas basicas que la API, para avisar antes de enviar.
  validate(data) {
    const errors = [];
    if (!data.title) errors.push('El titulo es obligatorio.');
    if (!data.description) errors.push('La descripcion es obligatoria.');
    return errors;
  },

  showErrors(errors) {
    const el = document.getElementById('form-errors');
    el.textContent = errors.join(' ');
    el.hidden = errors.length === 0;
  },

  fill(incident) {
    document.getElementById('incident-id').value = incident.id;
    this.fields.forEach((name) => {
      document.getElementById(name).value = incident[name] || '';
    });
    document.getElementById('form-title').textContent = 'Editar incidente';
    document.getElementById('submit-btn').textContent = 'Guardar cambios';
    document.getElementById('cancel-btn').hidden = false;
    this.showErrors([]);
    document.getElementById('title').focus();
  },

  reset() {
    this.el.reset();
    document.getElementById('incident-id').value = '';
    document.getElementById('form-title').textContent = 'Nuevo incidente';
    document.getElementById('submit-btn').textContent = 'Crear incidente';
    document.getElementById('cancel-btn').hidden = true;
    this.showErrors([]);
  },

  editingId() {
    return document.getElementById('incident-id').value || null;
  },
};

document.getElementById('cancel-btn').addEventListener('click', () => incidentForm.reset());
