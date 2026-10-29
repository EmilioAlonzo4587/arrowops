// Cliente minimo de la API de incidentes.
const api = {
  async listIncidents(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const query = params.toString();
    return request(`/api/incidents${query ? `?${query}` : ''}`);
  },

  getIncident(id) {
    return request(`/api/incidents/${encodeURIComponent(id)}`);
  },

  createIncident(data) {
    return request('/api/incidents', { method: 'POST', body: JSON.stringify(data) });
  },

  updateIncident(id, data) {
    return request(`/api/incidents/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  deleteIncident(id) {
    return request(`/api/incidents/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  assignIncident(id, technicianId) {
    return request(`/api/incidents/${encodeURIComponent(id)}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ technicianId }),
    });
  },

  changeStatus(id, status) {
    return request(`/api/incidents/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  getHistory(id) {
    return request(`/api/incidents/${encodeURIComponent(id)}/history`);
  },

  addComment(id, data) {
    return request(`/api/incidents/${encodeURIComponent(id)}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getStats() {
    return request('/api/stats');
  },

  listTechnicians() {
    return request('/api/technicians');
  },

  getMeta() {
    return request('/api/meta');
  },

  getHealth() {
    return request('/health');
  },
};

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const errors = body && body.errors ? body.errors : [`Error ${res.status}`];
    throw new Error(errors.join(' '));
  }
  return body;
}
