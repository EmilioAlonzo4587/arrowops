const { loadConfig } = require('../../backend/src/config');
const { version } = require('../../package.json');

describe('loadConfig', () => {
  test('usa valores por defecto sin variables de entorno', () => {
    expect(loadConfig({})).toEqual({ port: 3000, nodeEnv: 'development', appVersion: version, databaseUrl: null });
  });

  test('lee PORT y NODE_ENV; la version sale de package.json', () => {
    const config = loadConfig({ PORT: '8080', NODE_ENV: 'production' });
    expect(config).toEqual({ port: 8080, nodeEnv: 'production', appVersion: version, databaseUrl: null });
  });

  test.each(['abc', '0', '70000', '3000.5'])('rechaza PORT invalido: %s', (port) => {
    expect(() => loadConfig({ PORT: port })).toThrow('PORT invalido');
  });

  test('acepta DATABASE_URL de PostgreSQL', () => {
    const url = 'postgres://arrowops:secreto@localhost:5433/arrowops';
    expect(loadConfig({ DATABASE_URL: url }).databaseUrl).toBe(url);
  });

  test('rechaza DATABASE_URL invalida sin exponer su valor', () => {
    const fn = () => loadConfig({ DATABASE_URL: 'mysql://user:secreto@host/db' });
    expect(fn).toThrow('DATABASE_URL invalida');
    expect(fn).not.toThrow(/secreto/);
  });

  test('rechaza NODE_ENV desconocido', () => {
    expect(() => loadConfig({ NODE_ENV: 'staging' })).toThrow('NODE_ENV invalido');
  });
});
