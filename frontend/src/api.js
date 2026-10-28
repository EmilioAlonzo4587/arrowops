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
