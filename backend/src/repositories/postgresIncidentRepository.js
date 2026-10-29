// Repositorio PostgreSQL. Misma interfaz que el repositorio en memoria, pero asincrona.
// Todas las consultas son parametrizadas ($1, $2...) para evitar inyeccion SQL.
const SELECT_INCIDENT = `
  SELECT i.id, i.title, i.description, i.priority, i.category, i.status, i.reporter,
         i.created_at AS "createdAt", i.updated_at AS "updatedAt",
         t.id AS "technicianId", t.name AS "technicianName"
  FROM incidents i
  LEFT JOIN technicians t ON t.id = i.technician_id`;

// Los ids invalidos no son un error del cliente en esta API: simplemente no existen.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toIncident({ technicianId, technicianName, ...row }) {
  return {
    ...row,
    technician: technicianId ? { id: technicianId, name: technicianName } : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function createPostgresIncidentRepository(pool) {
  async function findById(id) {
    if (!UUID_PATTERN.test(id)) return null;
    const { rows } = await pool.query(`${SELECT_INCIDENT} WHERE i.id = $1`, [id]);
    return rows[0] ? toIncident(rows[0]) : null;
  }

  // Ejecuta un UPDATE ... RETURNING id y devuelve el incidente completo (con su tecnico).
  async function updateAndFetch(sql, params) {
    if (!UUID_PATTERN.test(params[0])) return null;
    const { rows } = await pool.query(sql, params);
    return rows[0] ? findById(rows[0].id) : null;
  }

  return {
    async create(data) {
      const { rows } = await pool.query(
        `INSERT INTO incidents (title, description, priority, category, reporter)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          data.title.trim(),
          data.description.trim(),
          data.priority,
          data.category,
          data.reporter ? data.reporter.trim() : null,
        ],
      );
      return findById(rows[0].id);
    },

    async list({ status, priority, category, technicianId } = {}) {
      const { rows } = await pool.query(
        `${SELECT_INCIDENT}
         WHERE ($1::text IS NULL OR i.status = $1)
           AND ($2::text IS NULL OR i.priority = $2)
           AND ($3::text IS NULL OR i.category = $3)
           AND ($4::int  IS NULL OR i.technician_id = $4)
         ORDER BY i.created_at DESC`,
        [status || null, priority || null, category || null, technicianId || null],
      );
      return rows.map(toIncident);
    },

    findById,

    update(id, data) {
      return updateAndFetch(
        `UPDATE incidents
         SET title = $2, description = $3, priority = $4, category = $5, reporter = $6, updated_at = now()
         WHERE id = $1
         RETURNING id`,
        [
          id,
          data.title.trim(),
          data.description.trim(),
          data.priority,
          data.category,
          data.reporter ? data.reporter.trim() : null,
        ],
      );
    },

    setAssignment(id, technicianId, status) {
      return updateAndFetch(
        `UPDATE incidents SET technician_id = $2, status = $3, updated_at = now()
         WHERE id = $1 RETURNING id`,
        [id, technicianId, status],
      );
    },

    setStatus(id, status) {
      return updateAndFetch(
        'UPDATE incidents SET status = $2, updated_at = now() WHERE id = $1 RETURNING id',
        [id, status],
      );
    },

    async remove(id) {
      if (!UUID_PATTERN.test(id)) return false;
      const { rowCount } = await pool.query('DELETE FROM incidents WHERE id = $1', [id]);
      return rowCount > 0;
    },

    async listTechnicians() {
      const { rows } = await pool.query('SELECT id, name FROM technicians WHERE active ORDER BY name');
      return rows;
    },

    async findTechnician(id) {
      const { rows } = await pool.query('SELECT id, name FROM technicians WHERE id = $1 AND active', [id]);
      return rows[0] || null;
    },
  };
}

module.exports = { createPostgresIncidentRepository };
