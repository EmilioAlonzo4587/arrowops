const { createApp } = require('./app');
const { loadConfig } = require('./config');

const config = loadConfig();

createApp().listen(config.port, () => {
  console.log(`ArrowOps ${config.appVersion} (${config.nodeEnv}) escuchando en http://localhost:${config.port}`);
});
