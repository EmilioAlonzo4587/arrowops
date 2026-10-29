// Configuracion de la app leida de variables de entorno.
// Ningun valor sensible vive en el codigo: ver .env.example y docs/seguridad.md.
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

  return {
    port,
    nodeEnv,
    appVersion: env.npm_package_version || 'dev',
  };
}

module.exports = { loadConfig };
