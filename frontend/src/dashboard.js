// Dashboard de indicadores (GET /api/stats). Construye el DOM con textContent,
// sin innerHTML, asi que los nombres de tecnicos no pueden inyectar HTML.
const dashboard = {
  categoryLabels: { hardware: 'Hardware', software: 'Software', red: 'Red', accesos: 'Accesos', otro: 'Otro' },

  render(stats) {
    document.getElementById('kpi-abiertos').textContent = stats.abiertos;
    document.getElementById('kpi-criticos').textContent = stats.criticos;
    document.getElementById('kpi-cerrados').textContent = stats.cerrados;
    document.getElementById('kpi-total').textContent = stats.total;

    this.renderBars('chart-categoria', stats.porCategoria, this.categoryLabels);
    this.renderBars('chart-tecnico', stats.porTecnico, {});
  },

  // Barras horizontales proporcionales al valor maximo, ordenadas de mayor a menor.
  renderBars(containerId, counts, labels) {
    const container = document.getElementById(containerId);
    container.replaceChildren();

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0 || entries.every(([, n]) => n === 0)) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'Sin datos.';
      container.append(empty);
      return;
    }

    const max = Math.max(...entries.map(([, n]) => n));
    for (const [key, value] of entries) {
      const row = document.createElement('div');
      row.className = 'bar-row';

      const label = document.createElement('span');
      label.className = 'bar-label';
      label.textContent = labels[key] || key;

      const track = document.createElement('span');
      track.className = 'bar-track';
      const fill = document.createElement('span');
      fill.className = 'bar-fill';
      fill.style.width = `${max ? (value / max) * 100 : 0}%`;
      track.append(fill);

      const count = document.createElement('span');
      count.className = 'bar-value';
      count.textContent = value;

      row.append(label, track, count);
      container.append(row);
    }
  },
};
