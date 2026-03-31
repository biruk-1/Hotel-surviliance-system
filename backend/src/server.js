require('./config');

const http = require('http');
const app = require('./app');
const config = require('./config');
const { closePool } = require('./config/database');
const logger = require('./utils/logger');

const server = http.createServer(app);

function gracefulShutdown(signal) {
  return () => {
    logger.info(`Received ${signal}, closing server and database pool`);
    server.close(async (closeErr) => {
      if (closeErr) {
        logger.error('Error closing HTTP server', closeErr);
      }
      try {
        await closePool();
      } catch (err) {
        logger.error('Error closing database pool', err);
      }
      process.exit(closeErr ? 1 : 0);
    });
  };
}

server.listen(config.port, () => {
  logger.info(`Server listening on port ${config.port}`, { env: config.nodeEnv });
});

process.on('SIGTERM', gracefulShutdown('SIGTERM'));
process.on('SIGINT', gracefulShutdown('SIGINT'));
