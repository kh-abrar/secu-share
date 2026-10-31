const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const request = require('supertest');
const h = require('./helpers');
const User = require('../src/models/User');
const File = require('../src/models/File');

before(h.setup);
after(h.teardown);

describe('registration and login', () => {
  it('registers, starts a session and returns the key material', async () => {
    const { agent, creds, user } = await h.createUser('alice@example.com', { verified: false });
    assert.equal(user.email, 'alice@example.com');
    assert.equal(user.emailVerified, false);

    const me = await agent.get('/api/auth/me');
    assert.equal(me.body.user.email, 'alice@example.com');

    const keys = await agent.get('/api/auth/keys');
    assert.equal(keys.body.publicKey, creds.publicKey);
    assert.equal(keys.body.encryptedPrivateKey, creds.encryptedPrivateKey);
  });

  it('never stores the auth hash in plaintext', async () => {
    const stored = await User.findOne({ email: 'alice@example.com' }).select('+passwordHash').lean();
    assert.match(stored.passwordHash, /^\$2[aby]\$12\$/);
  });

  it('rejects duplicate emails, case-insensitively', async () => {
    const res = await request(h.getApp())
      .post('/api/auth/register')
      .send({ email: 'ALICE@example.com', name: 'A', ...h.fakeCredentials() });
    assert.equal(res.status, 409);
  });

  it('rejects malformed input', async () => {
    const res = await request(h.getApp())
      .post('/api/auth/register')
      .send({ email: { $ne: null }, name: 'x', ...h.fakeCredentials() });
    assert.equal(res.status, 400);
  });

  it('logs in with the right auth hash only', async () => {
    const { creds } = await h.createUser('bob@example.com');
    const app = h.getApp();

    const bad = await request(app).post('/api/auth/login').send({ email: 'bob@example.com', authHash: h.b64(32) });
    assert.equal(bad.status, 401);
    const unknown = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', authHash: h.b64(32) });
    assert.equal(unknown.status, 401);
    assert.equal(unknown.body.message, bad.body.message, 'same message for unknown accounts');

    const ok = await request(app).post('/api/auth/login').send({ email: 'bob@example.com', authHash: creds.authHash });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.keys.encryptedPrivateKey, creds.encryptedPrivateKey);
  });

  it('issues a new session id on login', async () => {
    const { creds } = await h.createUser('carol@example.com');
    const agent = request.agent(h.getApp());
    const first = await agent.post('/api/auth/login').send({ email: 'carol@example.com', authHash: creds.authHash });
    const second = await agent.post('/api/auth/login').send({ email: 'carol@example.com', authHash: creds.authHash });
    const sid = (res) => res.headers['set-cookie'].find((c) => c.startsWith('sid=')).split(';')[0];
    assert.notEqual(sid(first), sid(second));
  });

  it('logs out', async () => {
    const { agent } = await h.createUser('dave@example.com');
    await agent.post('/api/auth/logout').expect(200);
    const me = await agent.get('/api/auth/me');
    assert.equal(me.body.user, null);
    await agent.get('/api/files').expect(401);
  });
});

describe('email verification', () => {
  it('verifies with a valid token once', async () => {
    const { agent } = await h.createUser('erin@example.com', { verified: false });
    const token = crypto.randomBytes(32).toString('hex');
    await User.updateOne(
      { email: 'erin@example.com' },
      {
        emailVerificationTokenHash: crypto.createHash('sha256').update(token).digest('hex'),
        emailVerificationExpires: new Date(Date.now() + 60_000),
      }
    );

    await agent.post('/api/auth/verify-email').send({ token }).expect(200);
    const me = await agent.get('/api/auth/me');
    assert.equal(me.body.user.emailVerified, true);
    await agent.post('/api/auth/verify-email').send({ token }).expect(400);
  });

  it('rejects expired tokens', async () => {
    await h.createUser('frank@example.com', { verified: false });
    const token = crypto.randomBytes(32).toString('hex');
    await User.updateOne(
      { email: 'frank@example.com' },
      {
        emailVerificationTokenHash: crypto.createHash('sha256').update(token).digest('hex'),
        emailVerificationExpires: new Date(Date.now() - 1000),
      }
    );
    await request(h.getApp()).post('/api/auth/verify-email').send({ token }).expect(400);
  });
});

describe('password change and account deletion', () => {
  it('requires the current password and rotates key material', async () => {
    const { agent, creds } = await h.createUser('gina@example.com');
    const next = h.fakeCredentials();

    await agent
      .post('/api/auth/change-password')
      .send({ currentAuthHash: h.b64(32), newAuthHash: next.authHash, encryptedPrivateKey: next.encryptedPrivateKey, privateKeyIv: next.privateKeyIv })
      .expect(401);

    await agent
      .post('/api/auth/change-password')
      .send({ currentAuthHash: creds.authHash, newAuthHash: next.authHash, encryptedPrivateKey: next.encryptedPrivateKey, privateKeyIv: next.privateKeyIv })
      .expect(200);

    const app = h.getApp();
    await request(app).post('/api/auth/login').send({ email: 'gina@example.com', authHash: creds.authHash }).expect(401);
    const ok = await request(app).post('/api/auth/login').send({ email: 'gina@example.com', authHash: next.authHash }).expect(200);
    assert.equal(ok.body.keys.encryptedPrivateKey, next.encryptedPrivateKey);
  });

  it('signs out other sessions on password change, keeping the current one', async () => {
    const { agent: laptop, creds } = await h.createUser('ivy@example.com');
    const phone = request.agent(h.getApp());
    await phone.post('/api/auth/login').send({ email: 'ivy@example.com', authHash: creds.authHash }).expect(200);
    await phone.get('/api/files').expect(200);

    const next = h.fakeCredentials();
    await laptop
      .post('/api/auth/change-password')
      .send({ currentAuthHash: creds.authHash, newAuthHash: next.authHash, encryptedPrivateKey: next.encryptedPrivateKey, privateKeyIv: next.privateKeyIv })
      .expect(200);

    await laptop.get('/api/files').expect(200);
    await phone.get('/api/files').expect(401);
    assert.equal((await phone.get('/api/auth/me')).body.user, null);
  });

  it('deletes the account with all its files and blobs', async () => {
    const { agent, creds, user } = await h.createUser('hank@example.com');
    await h.uploadFile(agent, { name: 'x.bin', path: '/docs/' }).expect(201);
    const before = h.storedBlobCount();

    await agent.delete('/api/auth/account').send({ authHash: h.b64(32) }).expect(401);
    await agent.delete('/api/auth/account').send({ authHash: creds.authHash }).expect(200);

    assert.equal(await User.countDocuments({ email: 'hank@example.com' }), 0);
    assert.equal(await File.countDocuments({ owner: user.id }), 0);
    assert.equal(h.storedBlobCount(), before - 1);
    await agent.get('/api/files').expect(401);
  });
});

describe('cross-site request protection', () => {
  it('rejects state-changing requests from foreign origins', async () => {
    const { agent } = await h.createUser('ivan@example.com');
    await agent.post('/api/files/folders').set('Origin', 'https://evil.example').send({ name: 'x' }).expect(403);
    await agent.post('/api/files/folders').set('Origin', 'http://app.test').send({ name: 'x' }).expect(201);
  });

  it('does not send CORS headers to foreign origins', async () => {
    const res = await request(h.getApp()).get('/api/auth/me').set('Origin', 'https://app.test.evil.example');
    assert.equal(res.headers['access-control-allow-origin'], undefined);
  });
});
