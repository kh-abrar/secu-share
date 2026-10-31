const pino = require('pino');
const config = require('../config');

const logger = pino({
  level: config.NODE_ENV === 'test' ? 'silent' : config.LOG_LEVEL,
  redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
  transport: config.isProduction || config.NODE_ENV === 'test'
    ? undefined
    : { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' } },
});

module.exports = logger;
