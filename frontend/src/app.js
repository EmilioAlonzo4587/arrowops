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
    </tr>`).join('');

  listEl.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Incidente</th><th>Prioridad</th><th>Estado</th><th>Reportado por</th><th>Creado</th></tr>
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

statusFilterEl.addEventListener('change', loadIncidents);

loadIncidents();
