const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const h = require('./helpers');
const ShareLink = require('../src/models/ShareLink');

after(h.teardown);

let owner;
let fileId;

before(async () => {
  await h.setup();
  owner = await h.createUser('owner@example.com');
  fileId = (await h.uploadFile(owner.agent, { name: 'shared.pdf' }).expect(201)).body._id;
});

const createLink = async (body = {}) => (await owner.agent.post(`/api/files/${fileId}/links`).send(body).expect(201)).body;
const anon = () => request(h.getApp());

describe('public links', () => {
  it('serves metadata and counts downloads up to the limit', async () => {
    const link = await createLink({ maxDownloads: 2 });
    const meta = await anon().post(`/api/public/links/${link.token}`).send({}).expect(200);
    assert.equal(meta.body.file.name, 'shared.pdf');
    assert.equal(meta.body.downloadsRemaining, 2);

    await anon().post(`/api/public/links/${link.token}/download`).send({}).expect(200);
    await anon().post(`/api/public/links/${link.token}/download`).send({}).expect(200);
    await anon().post(`/api/public/links/${link.token}/download`).send({}).expect(410);
  });

  it('never exceeds the download limit under concurrency', async () => {
    const link = await createLink({ maxDownloads: 3 });
    const results = await Promise.all(
      Array.from({ length: 10 }, () => anon().post(`/api/public/links/${link.token}/download`).send({}))
    );
    assert.equal(results.filter((r) => r.status === 200).length, 3);
  });

  it('stops working once expired or revoked', async () => {
    const expired = await createLink();
    await ShareLink.updateOne({ _id: expired.id }, { expiresAt: new Date(Date.now() - 1000) });
    await anon().post(`/api/public/links/${expired.token}`).send({}).expect(410);

    const revoked = await createLink();
    await owner.agent.delete(`/api/links/${revoked.id}`).expect(200);
    await anon().post(`/api/public/links/${revoked.token}`).send({}).expect(404);
  });

  it('only lets the owner revoke a link', async () => {
    const link = await createLink();
    const { agent: other } = await h.createUser('other-revoker@example.com');
    await other.delete(`/api/links/${link.id}`).expect(404);
  });
});

describe('password-protected links', () => {
  it('reveals nothing without the correct password', async () => {
    const link = await createLink({ password: 'hunter22' });
    assert.equal(link.hasPassword, true);

    const none = await anon().post(`/api/public/links/${link.token}`).send({}).expect(401);
    assert.equal(none.body.details.reason, 'password_required');
    assert.equal(none.body.file, undefined);

    const wrong = await anon().post(`/api/public/links/${link.token}/download`).send({ password: 'nope' }).expect(401);
    assert.equal(wrong.body.details.reason, 'password_incorrect');

    await anon().post(`/api/public/links/${link.token}/download`).send({ password: 'hunter22' }).expect(200);
  });
});

describe('restricted links', () => {
  it('requires a signed-in, verified, listed account', async () => {
    const link = await createLink({ scope: 'restricted', emails: ['invitee@example.com', 'pending@example.com'] });

    await anon().post(`/api/public/links/${link.token}`).send({}).expect(401);

    const { agent: stranger } = await h.createUser('stranger@example.com');
    await stranger.post(`/api/public/links/${link.token}`).send({}).expect(403);

    // Someone who registered the invitee's address but can't prove they own it
    const { agent: squatter } = await h.createUser('pending@example.com', { verified: false });
    await squatter.post(`/api/public/links/${link.token}`).send({}).expect(403);

    const { agent: invitee } = await h.createUser('invitee@example.com');
    await invitee.post(`/api/public/links/${link.token}/download`).send({}).expect(200);
  });

  it('needs at least one email', async () => {
    await owner.agent.post(`/api/files/${fileId}/links`).send({ scope: 'restricted' }).expect(400);
  });
});

describe('saving a shared file to your account', () => {
  it('creates an independent copy', async () => {
    const link = await createLink();
    const { agent: saver } = await h.createUser('saver@example.com');
    const blobs = h.storedBlobCount();

    const { body: copy } = await saver
      .post(`/api/public/links/${link.token}/save`)
      .send({ wrappedKey: h.b64(384) })
      .expect(201);
    assert.equal(copy.name, 'shared.pdf');
    assert.equal(h.storedBlobCount(), blobs + 1);

    // Deleting the copy must not affect the original
    await saver.delete(`/api/files/${copy._id}`).expect(200);
    await owner.agent.get(`/api/files/${fileId}/content`).expect(200);
  });

  it('applies the same rules as downloading', async () => {
    const link = await createLink({ password: 'secret-pw' });
    const { agent: saver } = await h.createUser('saver2@example.com');
    await saver.post(`/api/public/links/${link.token}/save`).send({ wrappedKey: h.b64(384) }).expect(401);
    await saver
      .post(`/api/public/links/${link.token}/save`)
      .send({ wrappedKey: h.b64(384), password: 'secret-pw' })
      .expect(201);
  });
});

describe('direct shares', () => {
  it('only reaches verified users and can be revoked', async () => {
    const { agent: friend, user: friendUser } = await h.createUser('friend@example.com');
    const { user: unverified } = await h.createUser('unverified@example.com', { verified: false });

    // Lookup exposes only verified accounts
    await owner.agent.get('/api/users/lookup?email=unverified@example.com').expect(404);
    const found = await owner.agent.get('/api/users/lookup?email=friend@example.com').expect(200);
    assert.equal(found.body.id, friendUser.id);
    assert.ok(found.body.publicKey);

    await owner.agent.post(`/api/files/${fileId}/shares`).send({ recipientId: unverified.id, wrappedKey: h.b64(384) }).expect(404);
    await owner.agent.post(`/api/files/${fileId}/shares`).send({ recipientId: friendUser.id, wrappedKey: h.b64(384) }).expect(201);

    assert.equal((await friend.get('/api/shared-with-me/unseen-count')).body.count, 1);
    const list = await friend.get('/api/shared-with-me').expect(200);
    assert.equal(list.body.files.length, 1);
    assert.equal(list.body.files[0].owner.email, 'owner@example.com');

    await friend.get(`/api/files/${fileId}/content`).expect(200);
    assert.equal((await friend.get('/api/shared-with-me/unseen-count')).body.count, 0, 'download marks it seen');

    // The recipient can read but not modify
    await friend.delete(`/api/files/${fileId}`).expect(404);

    await owner.agent.delete(`/api/files/${fileId}/shares/${friendUser.id}`).expect(200);
    await friend.get(`/api/files/${fileId}/content`).expect(404);
  });

  it('removes links and shares when the file is deleted', async () => {
    const { body: tmp } = await h.uploadFile(owner.agent, { name: 'temp.txt' }).expect(201);
    const { body: link } = await owner.agent.post(`/api/files/${tmp._id}/links`).send({}).expect(201);
    await owner.agent.delete(`/api/files/${tmp._id}`).expect(200);
    await anon().post(`/api/public/links/${link.token}`).send({}).expect(404);
    assert.equal(await ShareLink.countDocuments({ file: tmp._id }), 0);
  });
});
