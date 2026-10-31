const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const session = require('express-session');
const pinoHttp = require('pino-http');

const config = require('./config');
const logger = require('./lib/logger');
const limits = require('./middlewares/rateLimits');
const { createOriginGuard } = require('./middlewares/originGuard');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

function isAllowedOrigin(origin) {
  if (config.corsOrigins.includes(origin)) return true;
  if (config.corsOriginPattern?.test(origin)) return true;
  return false;
}

/**
 * @param {object} opts
 * @param {import('express-session').Store} [opts.sessionStore] defaults to the in-memory store (tests only)
 */
function createApp({ sessionStore } = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.TRUST_PROXY);

  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));
  app.use(helmet());
  app.use(compression());
  app.use(
    cors({
      // Disallowed origins simply get no CORS headers; the browser blocks the response
      origin: (origin, cb) => cb(null, !origin || isAllowedOrigin(origin)),
      credentials: true,
    })
  );
  app.use(createOriginGuard(isAllowedOrigin));

  app.use(
    session({
      name: 'sid',
      secret: config.SESSION_SECRET,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: config.COOKIE_SECURE,
        sameSite: config.COOKIE_SAMESITE,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use('/api', limits.api);
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/files', require('./routes/files'));
  app.use('/api/links', require('./routes/links'));
  app.use('/api/shared-with-me', require('./routes/sharedWithMe'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/public', require('./routes/public'));

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp, isAllowedOrigin };
