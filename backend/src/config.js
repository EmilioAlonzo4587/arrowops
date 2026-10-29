// Configuracion de la app leida de variables de entorno.
// Ningun valor sensible vive en el codigo: ver .env.example y docs/seguridad.md.
const { version } = require('../../package.json');

const ENVIRONMENTS = ['development', 'test', 'production'];

function loadConfig(env = process.env) {
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT invalido: "${env.PORT}". Debe ser un entero entre 1 y 65535.`);
  }

  const nodeEnv = env.NODE_ENV || 'development';
  if (!ENVIRONMENTS.includes(nodeEnv)) {
    throw new Error(`NODE_ENV invalido: "${nodeEnv}". Valores permitidos: ${ENVIRONMENTS.join(', ')}.`);
  }

  const databaseUrl = env.DATABASE_URL || null;
  if (databaseUrl && !/^postgres(ql)?:\/\//.test(databaseUrl)) {
    // No se incluye el valor en el mensaje: contiene la contrasena.
    throw new Error('DATABASE_URL invalida: debe empezar con postgres:// o postgresql://.');
  }

  return {
    port,
    nodeEnv,
    // Desde package.json: funciona igual con npm start que con node dentro del contenedor.
    appVersion: version,
    databaseUrl,
  };
}

module.exports = { loadConfig };
