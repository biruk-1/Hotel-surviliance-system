const config = require('../config');

function format(level, message, meta) {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level}] ${message}`;
  if (meta !== undefined) {
    return `${base} ${typeof meta === 'object' ? JSON.stringify(meta) : meta}`;
  }
  return base;
}

module.exports = {
  info(message, meta) {
    if (config.nodeEnv !== 'test') {
      console.log(format('INFO', message, meta));
    }
  },
  error(message, err) {
    const detail = err && err.stack ? err.stack : err;
    console.error(format('ERROR', message, detail));
  },
};
