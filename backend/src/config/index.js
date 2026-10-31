// Validated configuration, loaded on first require.
const { loadEnv } = require('./env');

module.exports = loadEnv();
