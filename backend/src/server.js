require('./config');

const http = require('http');
const app = require('./app');
const config = require('./config');
const { closePool } = require('./config/database');
const logger = require('./utils/logger');
const { initSocketServer, closeSocketServer } = require('./socket/socket.server');

const server = http.createServer(app);
initSocketServer(server);

function gracefulShutdown(signal) {
  return () => {
    logger.info(`Received ${signal}, closing Socket.io, HTTP server, and database pool`);
    closeSocketServer()
      .catch((err) => logger.error('Error closing Socket.io', err))
      .then(() => closePool())
      .then(() => {
        logger.info('Shutdown complete');
        process.exit(0);
      })
      .catch((err) => {
        logger.error('Shutdown error', err);
        process.exit(1);
      });
  };
}

server.listen(config.port, () => {
  logger.info(`Server listening on port ${config.port}`, { env: config.nodeEnv });
});

process.on('SIGTERM', gracefulShutdown('SIGTERM'));
process.on('SIGINT', gracefulShutdown('SIGINT'));
