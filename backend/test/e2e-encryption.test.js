// Full encryption round trips through the real API, using the web client's own crypto
// module (frontend/src/libs/crypto.ts; Node 22.18+ runs TypeScript natively).
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const request = require('supertest');
const h = require('./helpers');
const User = require('../src/models/User');
const File = require('../src/models/File');

let c; // client crypto module
const config = () => require('../src/config');

const PLAINTEXT = Buffer.from('Quarterly numbers: top secret. '.repeat(50000)); // ~1.5 MiB, several chunks

const toBuffer = async (blob) => Buffer.from(await blob.arrayBuffer());
const binary = (res, cb) => {
  const chunks = [];
  res.on('data', (d) => chunks.push(d));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

/** Registers like the browser does: derives secrets and generates a key pair. */
async function signUp(email, password) {
  const agent = request.agent(h.getApp());
  const { authHash, wrappingKey } = await c.deriveSecrets(email, password);
  const { material } = await c.createAccountKeys(wrappingKey);
  await agent.post('/api/auth/register').send({ email, name: email.split('@')[0], authHash, ...material }).expect(201);
  await User.updateOne({ email }, { emailVerified: true });
  return { agent, password, ...(await signIn(email, password)) };
}

/** Logs in like the browser does and unlocks the private key from the server's material. */
async function signIn(email, password) {
  const agent = request.agent(h.getApp());
  const { authHash, wrappingKey } = await c.deriveSecrets(email, password);
  const res = await agent.post('/api/auth/login').send({ email, authHash }).expect(200);
  return { agent, keys: await c.unlockAccountKeys(res.body.keys, wrappingKey) };
}

async function uploadEncrypted(agent, publicKey, name, plaintext) {
  const fileKey = await c.generateFileKey();
  const encrypted = await toBuffer(await c.encryptFile(new Blob([plaintext]), fileKey));
  const res = await agent
    .post('/api/files')
    .field('name', name)
    .field('path', '/')
    .field('mimetype', 'text/plain')
    .field('size', String(plaintext.length))
    .field('wrappedKey', await c.wrapFileKey(fileKey, publicKey))
    .attach('file', encrypted, 'encrypted.bin')
    .expect(201);
  return { file: res.body, fileKey };
}

async function downloadAndDecrypt(agent, url, key, body) {
  const req = body ? agent.post(url).send(body) : agent.get(url);
  const res = await req.buffer().parse(binary).expect(200);
  return toBuffer(await c.decryptFile(new Blob([res.body]), key));
}

before(async () => {
  await h.setup();
  c = await import(pathToFileURL(path.join(__dirname, '../../frontend/src/libs/crypto.ts')).href);
});
after(h.teardown);

describe('end-to-end encryption through the API', () => {
  let alice;
  let bob;
  let upload;

  before(async () => {
    alice = await signUp('alice@e2e.test', 'Alice-Password-1!');
    bob = await signUp('bob@e2e.test', 'Bob-Password-2!');
    upload = await uploadEncrypted(alice.agent, alice.keys.publicKey, 'report.txt', PLAINTEXT);
  });

  it('stores only ciphertext on the server', async () => {
    const doc = await File.findById(upload.file._id).lean();
    const stored = fs.readFileSync(path.join(config().STORAGE_DIR, doc.storageKey));
    assert.ok(stored.length > PLAINTEXT.length, 'ciphertext includes header and tags');
    assert.equal(stored.includes(Buffer.from('top secret')), false, 'no plaintext at rest');
  });

  it('lets the owner download and decrypt with their own key', async () => {
    const [listed] = (await alice.agent.get('/api/files?path=/').expect(200)).body.items;
    const key = await c.unwrapFileKey(listed.wrappedKey, alice.keys.privateKey);
    const plain = await downloadAndDecrypt(alice.agent, `/api/files/${listed._id}/content`, key);
    assert.ok(plain.equals(PLAINTEXT));
  });

  it("does not let another user unwrap the owner's key", async () => {
    await assert.rejects(c.unwrapFileKey(upload.file.wrappedKey, bob.keys.privateKey));
  });

  it('shares directly with a user, who decrypts with their own private key', async () => {
    const found = (await alice.agent.get('/api/users/lookup?email=bob@e2e.test').expect(200)).body;
    const wrappedForBob = await c.wrapFileKey(upload.fileKey, await c.importPublicKey(found.publicKey));
    await alice.agent.post(`/api/files/${upload.file._id}/shares`).send({ recipientId: found.id, wrappedKey: wrappedForBob }).expect(201);

    const [shared] = (await bob.agent.get('/api/shared-with-me').expect(200)).body.files;
    const key = await c.unwrapFileKey(shared.wrappedKey, bob.keys.privateKey);
    const plain = await downloadAndDecrypt(bob.agent, `/api/files/${shared._id}/content`, key);
    assert.ok(plain.equals(PLAINTEXT));
  });

  it('opens a password-protected link with the key from the URL fragment', async () => {
    const link = (await alice.agent.post(`/api/files/${upload.file._id}/links`).send({ password: 'open-sesame' }).expect(201)).body;
    const fragment = await c.exportFileKey(upload.fileKey);

    // What the recipient's browser does with /share/<token>#<fragment>
    const key = await c.importFileKey(fragment);
    const anon = request(h.getApp());
    const plain = await downloadAndDecrypt(anon, `/api/public/links/${link.token}/download`, key, { password: 'open-sesame' });
    assert.ok(plain.equals(PLAINTEXT));
  });

  it('saves a linked file into another account, re-wrapped for that account', async () => {
    const link = (await alice.agent.post(`/api/files/${upload.file._id}/links`).send({}).expect(201)).body;
    const key = await c.importFileKey(await c.exportFileKey(upload.fileKey));
    const copy = (
      await bob.agent
        .post(`/api/public/links/${link.token}/save`)
        .send({ wrappedKey: await c.wrapFileKey(key, bob.keys.publicKey) })
        .expect(201)
    ).body;

    const bobKey = await c.unwrapFileKey(copy.wrappedKey, bob.keys.privateKey);
    const plain = await downloadAndDecrypt(bob.agent, `/api/files/${copy._id}/content`, bobKey);
    assert.ok(plain.equals(PLAINTEXT));
  });

  it('keeps files readable after a password change, and rejects the old password', async () => {
    const email = 'alice@e2e.test';
    const oldS = await c.deriveSecrets(email, alice.password);
    const newS = await c.deriveSecrets(email, 'A-Brand-New-Password-3!');
    const material = (await alice.agent.get('/api/auth/keys').expect(200)).body;
    const rewrapped = await c.rewrapPrivateKey(material, oldS.wrappingKey, newS.wrappingKey);
    await alice.agent
      .post('/api/auth/change-password')
      .send({ currentAuthHash: oldS.authHash, newAuthHash: newS.authHash, ...rewrapped })
      .expect(200);

    await request(h.getApp()).post('/api/auth/login').send({ email, authHash: oldS.authHash }).expect(401);

    const fresh = await signIn(email, 'A-Brand-New-Password-3!');
    const key = await c.unwrapFileKey(upload.file.wrappedKey, fresh.keys.privateKey);
    const plain = await downloadAndDecrypt(fresh.agent, `/api/files/${upload.file._id}/content`, key);
    assert.ok(plain.equals(PLAINTEXT));
  });

  it('detects ciphertext tampered with at rest', async () => {
    const doc = await File.findById(upload.file._id).lean();
    const blobPath = path.join(config().STORAGE_DIR, doc.storageKey);
    const original = fs.readFileSync(blobPath);
    const tampered = Buffer.from(original);
    tampered[tampered.length - 100] ^= 0xff;
    fs.writeFileSync(blobPath, tampered);
    try {
      const res = await bob.agent.get(`/api/files/${upload.file._id}/content`).buffer().parse(binary).expect(200);
      const bobKey = await c.unwrapFileKey(
        (await bob.agent.get('/api/shared-with-me')).body.files[0].wrappedKey,
        bob.keys.privateKey
      );
      await assert.rejects(c.decryptFile(new Blob([res.body]), bobKey), { name: 'DecryptionError' });
    } finally {
      fs.writeFileSync(blobPath, original);
    }
  });
});
