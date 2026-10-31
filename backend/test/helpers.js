// Integration test harness: real Express app, in-memory MongoDB, local storage in a temp dir.
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secu-share-test-'));

Object.assign(process.env, {
  NODE_ENV: 'test',
  MONGODB_URI: 'mongodb://unused', // replaced by the in-memory server below
  SESSION_SECRET: 'test-secret-that-is-long-enough-1234567890',
  FRONTEND_URL: 'http://app.test',
  STORAGE_DRIVER: 'local',
  STORAGE_DIR: storageDir,
  MAX_FILE_SIZE: String(2 * 1024 * 1024),
  STORAGE_QUOTA_BYTES: String(5 * 1024 * 1024),
});

const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../src/app');
const User = require('../src/models/User');

let mongo;
let app;

async function setup() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  app = createApp();
}

async function teardown() {
  await mongoose.disconnect();
  await mongo?.stop();
  fs.rmSync(storageDir, { recursive: true, force: true });
}

const b64 = (n) => crypto.randomBytes(n).toString('base64');

// Stand-ins for the browser-derived values; the server treats them as opaque
const fakeCredentials = () => ({
  authHash: b64(32),
  publicKey: b64(400),
  encryptedPrivateKey: b64(1800),
  privateKeyIv: b64(12),
});

/** Registers a user and returns a cookie-carrying agent. */
async function createUser(email, { verified = true, name = email.split('@')[0] } = {}) {
  const agent = request.agent(app);
  const creds = fakeCredentials();
  const res = await agent.post('/api/auth/register').send({ email, name, ...creds });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  if (verified) await User.updateOne({ email }, { emailVerified: true });
  return { agent, creds, user: res.body.user };
}

/** Uploads bytes as an (already "encrypted") file. */
function uploadFile(agent, { name = 'a.bin', path: dir = '/', content = Buffer.from('ciphertext'), size } = {}) {
  return agent
    .post('/api/files')
    .field('name', name)
    .field('path', dir)
    .field('mimetype', 'application/octet-stream')
    .field('size', String(size ?? content.length))
    .field('wrappedKey', b64(384))
    .attach('file', content, 'blob');
}

const storedBlobCount = () =>
  fs.readdirSync(storageDir, { recursive: true }).filter((p) => fs.statSync(path.join(storageDir, p)).isFile()).length;

module.exports = {
  setup,
  teardown,
  getApp: () => app,
  createUser,
  uploadFile,
  fakeCredentials,
  storedBlobCount,
  b64,
};
