const { loadConfig } = require('../../backend/src/config');

describe('loadConfig', () => {
  test('usa valores por defecto sin variables de entorno', () => {
    expect(loadConfig({})).toEqual({ port: 3000, nodeEnv: 'development', appVersion: 'dev' });
  });

  test('lee PORT, NODE_ENV y la version del paquete', () => {
    const config = loadConfig({ PORT: '8080', NODE_ENV: 'production', npm_package_version: '0.4.0' });
    expect(config).toEqual({ port: 8080, nodeEnv: 'production', appVersion: '0.4.0' });
  });

  test.each(['abc', '0', '70000', '3000.5'])('rechaza PORT invalido: %s', (port) => {
    expect(() => loadConfig({ PORT: port })).toThrow('PORT invalido');
  });

  test('rechaza NODE_ENV desconocido', () => {
    expect(() => loadConfig({ NODE_ENV: 'staging' })).toThrow('NODE_ENV invalido');
  });
});
