// Repositorio PostgreSQL. Misma interfaz que el repositorio en memoria, pero asincrona.
// Todas las consultas son parametrizadas ($1, $2...) para evitar inyeccion SQL.
const COLUMNS = `id, title, description, priority, status, reporter,
  created_at AS "createdAt", updated_at AS "updatedAt"`;

// Los ids invalidos no son un error del cliente en esta API: simplemente no existen.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toIncident(row) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function createPostgresIncidentRepository(pool) {
  return {
    async create(data) {
      const { rows } = await pool.query(
        `INSERT INTO incidents (title, description, priority, status, reporter)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${COLUMNS}`,
        [
          data.title.trim(),
          data.description.trim(),
          data.priority,
          data.status || 'abierto',
          data.reporter ? data.reporter.trim() : null,
        ],
      );
      return toIncident(rows[0]);
    },

    async list({ status, priority } = {}) {
      const { rows } = await pool.query(
        `SELECT ${COLUMNS} FROM incidents
         WHERE ($1::text IS NULL OR status = $1)
           AND ($2::text IS NULL OR priority = $2)
         ORDER BY created_at DESC`,
        [status || null, priority || null],
      );
      return rows.map(toIncident);
    },

    async findById(id) {
      if (!UUID_PATTERN.test(id)) return null;
      const { rows } = await pool.query(`SELECT ${COLUMNS} FROM incidents WHERE id = $1`, [id]);
      return rows[0] ? toIncident(rows[0]) : null;
    },

    async update(id, data) {
      if (!UUID_PATTERN.test(id)) return null;
      const { rows } = await pool.query(
        `UPDATE incidents
         SET title = $2, description = $3, priority = $4,
             status = COALESCE($5, status), reporter = $6, updated_at = now()
         WHERE id = $1
         RETURNING ${COLUMNS}`,
        [
          id,
          data.title.trim(),
          data.description.trim(),
          data.priority,
          data.status || null,
          data.reporter ? data.reporter.trim() : null,
        ],
      );
      return rows[0] ? toIncident(rows[0]) : null;
    },

    async remove(id) {
      if (!UUID_PATTERN.test(id)) return false;
      const { rowCount } = await pool.query('DELETE FROM incidents WHERE id = $1', [id]);
      return rowCount > 0;
    },
  };
}

module.exports = { createPostgresIncidentRepository };
