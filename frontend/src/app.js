const listEl = document.getElementById('list');
const messageEl = document.getElementById('message');
const statusFilterEl = document.getElementById('status-filter');

const STATUS_LABELS = {
  abierto: 'Abierto',
  en_progreso: 'En progreso',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
};
const PRIORITY_LABELS = { baja: 'Baja', media: 'Media', alta: 'Alta', critica: 'Critica' };

function showMessage(text) {
  messageEl.textContent = text;
  messageEl.hidden = !text;
}

// Escapa texto del usuario antes de insertarlo como HTML.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' });
}

function renderIncidents(incidents) {
  if (incidents.length === 0) {
    listEl.innerHTML = '<p class="empty">No hay incidentes para mostrar.</p>';
    return;
  }

  const rows = incidents.map((i) => `
    <tr>
      <td>
        <strong>${escapeHtml(i.title)}</strong>
        <div class="muted">${escapeHtml(i.description)}</div>
      </td>
      <td><span class="badge priority-${i.priority}">${PRIORITY_LABELS[i.priority]}</span></td>
      <td><span class="badge status-${i.status}">${STATUS_LABELS[i.status]}</span></td>
      <td>${escapeHtml(i.reporter || '-')}</td>
      <td class="nowrap">${formatDate(i.createdAt)}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-sm" data-action="edit" data-id="${i.id}">Editar</button>
          <button class="btn btn-sm btn-danger" data-action="delete" data-id="${i.id}">Eliminar</button>
        </div>
      </td>
    </tr>`).join('');

  listEl.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Incidente</th><th>Prioridad</th><th>Estado</th><th>Reportado por</th><th>Creado</th><th></th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function loadIncidents() {
  try {
    const incidents = await api.listIncidents({ status: statusFilterEl.value });
    showMessage('');
    renderIncidents(incidents);
  } catch (err) {
    showMessage(`No se pudieron cargar los incidentes: ${err.message}`);
  }
}

async function saveIncident(event) {
  event.preventDefault();
  const data = incidentForm.read();
  const errors = incidentForm.validate(data);
  if (errors.length > 0) {
    incidentForm.showErrors(errors);
    return;
  }

  try {
    const id = incidentForm.editingId();
    if (id) {
      await api.updateIncident(id, data);
    } else {
      await api.createIncident(data);
    }
    incidentForm.reset();
    await loadIncidents();
  } catch (err) {
    incidentForm.showErrors([err.message]);
  }
}

async function handleRowAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;

  try {
    if (action === 'edit') {
      incidentForm.fill(await api.getIncident(id));
    } else if (action === 'delete' && window.confirm('Eliminar este incidente?')) {
      await api.deleteIncident(id);
      if (incidentForm.editingId() === id) incidentForm.reset();
      await loadIncidents();
    }
  } catch (err) {
    showMessage(err.message);
  }
}

statusFilterEl.addEventListener('change', loadIncidents);
incidentForm.el.addEventListener('submit', saveIncident);
listEl.addEventListener('click', handleRowAction);

loadIncidents();
