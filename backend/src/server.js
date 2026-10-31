require('dotenv').config({ quiet: true });

const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');

let config;
try {
  config = require('./config');
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const logger = require('./lib/logger');
const { createApp } = require('./app');
const { verifyMailer } = require('./services/mailer');

async function main() {
  await mongoose.connect(config.MONGODB_URI);
  logger.info('Connected to MongoDB');

  const sessionStore = MongoStore.create({
    client: mongoose.connection.getClient(),
    ttl: 7 * 24 * 60 * 60,
    touchAfter: 24 * 60 * 60,
  });

  await verifyMailer();

  const app = createApp({ sessionStore });
  const server = app.listen(config.PORT, () => {
    logger.info(`API listening on port ${config.PORT} (storage: ${config.STORAGE_DRIVER})`);
  });

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    // Don't hang forever on long-lived connections
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start');
  process.exit(1);
});
