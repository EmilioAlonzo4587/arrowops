const listEl = document.getElementById('list');
const messageEl = document.getElementById('message');

function showMessage(text) {
  messageEl.textContent = text;
  messageEl.hidden = !text;
}

async function loadIncidents() {
  try {
    const incidents = await api.listIncidents();
    showMessage('');
    listEl.innerHTML = `<p class="empty">${incidents.length} incidentes registrados.</p>`;
  } catch (err) {
    showMessage(`No se pudieron cargar los incidentes: ${err.message}`);
  }
}

loadIncidents();
