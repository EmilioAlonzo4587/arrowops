const listEl = document.getElementById('list');
const messageEl = document.getElementById('message');
const filterEls = [...document.querySelectorAll('[data-filter]')];
const technicianFilterEl = document.getElementById('technician-filter');
const detailPanelEl = document.getElementById('detail-panel');
const timelineEl = document.getElementById('timeline');
const commentFormEl = document.getElementById('comment-form');

const STATUS_LABELS = {
  NUEVO: 'Nuevo',
  ASIGNADO: 'Asignado',
  EN_PROCESO: 'En proceso',
  RESUELTO: 'Resuelto',
  CERRADO: 'Cerrado',
};
const PRIORITY_LABELS = { baja: 'Baja', media: 'Media', alta: 'Alta', critica: 'Critica' };
const CATEGORY_LABELS = { hardware: 'Hardware', software: 'Software', red: 'Red', accesos: 'Accesos', otro: 'Otro' };
// Estados en los que el servidor permite asignar o reasignar tecnico.
const ASSIGNABLE = ['NUEVO', 'ASIGNADO', 'EN_PROCESO'];

// Catalogos que vienen del servidor (GET /api/meta y /api/technicians) e incidente abierto en el detalle.
const state = { transitions: {}, technicians: [], detailId: null };

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

function technicianCell(incident) {
  if (!ASSIGNABLE.includes(incident.status)) {
    return escapeHtml(incident.technician ? incident.technician.name : '-');
  }
  const current = incident.technician ? incident.technician.id : '';
  const options = state.technicians.map((t) =>
    `<option value="${t.id}" ${t.id === current ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('');
  return `<select class="assign" data-id="${incident.id}" aria-label="Asignar tecnico">
      <option value="" ${current ? '' : 'selected'} disabled>Asignar...</option>${options}
    </select>`;
}

// Botones para los siguientes estados validos (ASIGNADO se alcanza asignando un tecnico).
function statusCell(incident) {
  const next = (state.transitions[incident.status] || []).filter((s) => s !== 'ASIGNADO');
  const buttons = next.map((s) =>
    `<button class="btn btn-sm" data-action="status" data-status="${s}" data-id="${incident.id}"
       ${incident.technician ? '' : 'disabled title="Asigna un tecnico primero"'}>&rarr; ${STATUS_LABELS[s]}</button>`).join('');
  return `<span class="badge status-${incident.status}">${STATUS_LABELS[incident.status]}</span>
    <div class="row-actions">${buttons}</div>`;
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
      <td>${CATEGORY_LABELS[i.category] || escapeHtml(i.category)}</td>
      <td><span class="badge priority-${i.priority}">${PRIORITY_LABELS[i.priority]}</span></td>
      <td>${statusCell(i)}</td>
      <td>${technicianCell(i)}</td>
      <td>${escapeHtml(i.reporter || '-')}</td>
      <td class="nowrap">${formatDate(i.createdAt)}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-sm" data-action="history" data-id="${i.id}">Historial</button>
          <button class="btn btn-sm" data-action="edit" data-id="${i.id}">Editar</button>
          <button class="btn btn-sm btn-danger" data-action="delete" data-id="${i.id}">Eliminar</button>
        </div>
      </td>
    </tr>`).join('');

  listEl.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Incidente</th><th>Categoria</th><th>Prioridad</th><th>Estado</th><th>Tecnico</th>
              <th>Usuario</th><th>Fecha</th><th></th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function currentFilters() {
  return Object.fromEntries(filterEls.map((el) => [el.dataset.filter, el.value]));
}

async function loadIncidents() {
  try {
    const incidents = await api.listIncidents(currentFilters());
    showMessage('');
    renderIncidents(incidents);
  } catch (err) {
    showMessage(`No se pudieron cargar los incidentes: ${err.message}`);
  }
}

async function loadStats() {
  try {
    dashboard.render(await api.getStats());
  } catch (err) {
    showMessage(`No se pudieron cargar los indicadores: ${err.message}`);
  }
}

// Recarga tabla, indicadores y, si esta abierto, el historial.
async function refresh() {
  await Promise.all([loadIncidents(), loadStats(), state.detailId ? loadHistory() : null]);
}

const EVENT_TEXT = {
  creado: (e) => `Incidente creado (${STATUS_LABELS[e.toStatus] || e.toStatus})`,
  editado: () => 'Datos del incidente editados',
  asignado: (e) => e.message,
  estado: (e) => `Estado: ${STATUS_LABELS[e.fromStatus] || e.fromStatus} &rarr; ${STATUS_LABELS[e.toStatus] || e.toStatus}`,
  comentario: (e) => e.message,
};

function renderHistory(events) {
  timelineEl.innerHTML = events.map((e) => `
    <li class="event event-${e.type}">
      <div class="event-meta">${formatDate(e.createdAt)} &middot; ${escapeHtml(e.author || 'Sistema')}</div>
      <div>${e.type === 'estado' ? EVENT_TEXT.estado(e) : escapeHtml(EVENT_TEXT[e.type](e))}</div>
    </li>`).join('') || '<li class="empty">Sin eventos.</li>';
}

async function loadHistory() {
  try {
    renderHistory(await api.getHistory(state.detailId));
  } catch (err) {
    showMessage(err.message);
  }
}

async function openDetail(id) {
  const incident = await api.getIncident(id);
  state.detailId = id;
  document.getElementById('detail-title').textContent = `Historial: ${incident.title}`;
  detailPanelEl.hidden = false;
  await loadHistory();
  detailPanelEl.scrollIntoView({ behavior: 'smooth' });
}

function closeDetail() {
  state.detailId = null;
  detailPanelEl.hidden = true;
}

async function saveComment(event) {
  event.preventDefault();
  const errorsEl = document.getElementById('comment-errors');
  const message = document.getElementById('comment-message').value.trim();
  const author = document.getElementById('comment-author').value.trim();
  if (!message) {
    errorsEl.textContent = 'El comentario es obligatorio.';
    errorsEl.hidden = false;
    return;
  }
  try {
    await api.addComment(state.detailId, author ? { author, message } : { message });
    document.getElementById('comment-message').value = '';
    errorsEl.hidden = true;
    await loadHistory();
  } catch (err) {
    errorsEl.textContent = err.message;
    errorsEl.hidden = false;
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
    await refresh();
  } catch (err) {
    incidentForm.showErrors([err.message]);
  }
}

async function handleRowAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id, status } = button.dataset;

  try {
    if (action === 'history') {
      await openDetail(id);
    } else if (action === 'edit') {
      incidentForm.fill(await api.getIncident(id));
    } else if (action === 'status') {
      await api.changeStatus(id, status);
      await refresh();
    } else if (action === 'delete' && window.confirm('Eliminar este incidente?')) {
      await api.deleteIncident(id);
      if (incidentForm.editingId() === id) incidentForm.reset();
      if (state.detailId === id) closeDetail();
      await refresh();
    }
  } catch (err) {
    showMessage(err.message);
  }
}

async function handleAssign(event) {
  const select = event.target.closest('select.assign');
  if (!select || !select.value) return;
  try {
    await api.assignIncident(select.dataset.id, Number(select.value));
    await refresh();
  } catch (err) {
    showMessage(err.message);
  }
}

async function init() {
  try {
    const [meta, technicians] = await Promise.all([api.getMeta(), api.listTechnicians()]);
    state.transitions = meta.transitions;
    state.technicians = technicians;
    technicianFilterEl.append(...technicians.map((t) => new Option(t.name, t.id)));
  } catch (err) {
    showMessage(`No se pudieron cargar los catalogos: ${err.message}`);
  }
  await refresh();
}

filterEls.forEach((el) => el.addEventListener('change', loadIncidents));
document.getElementById('clear-filters').addEventListener('click', () => {
  filterEls.forEach((el) => { el.value = ''; });
  loadIncidents();
});
document.getElementById('detail-close').addEventListener('click', closeDetail);
commentFormEl.addEventListener('submit', saveComment);
incidentForm.el.addEventListener('submit', saveIncident);
listEl.addEventListener('click', handleRowAction);
listEl.addEventListener('change', handleAssign);

init();
