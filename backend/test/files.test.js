const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

before(h.setup);
after(h.teardown);

const names = (res) => res.body.items.map((i) => i.name);

describe('upload and download', () => {
  it('stores the blob and returns exactly the uploaded bytes', async () => {
    const { agent } = await h.createUser('owner@example.com');
    const content = Buffer.from('opaque ciphertext bytes');
    const up = await h.uploadFile(agent, { name: 'report.pdf', content }).expect(201);
    assert.equal(up.body.name, 'report.pdf');
    assert.equal(up.body.storageKey, undefined, 'storage keys are never exposed');

    const down = await agent.get(`/api/files/${up.body._id}/content`).buffer().parse((res, cb) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    assert.equal(down.status, 200);
    assert.equal(down.headers['content-type'], 'application/octet-stream');
    assert.deepEqual(down.body, content);
  });

  it('creates missing folders for nested uploads', async () => {
    const { agent } = await h.createUser('nested@example.com');
    await h.uploadFile(agent, { name: 'c.txt', path: '/a/b/' }).expect(201);
    assert.deepEqual(names(await agent.get('/api/files?path=/')), ['a']);
    assert.deepEqual(names(await agent.get('/api/files?path=/a/')), ['b']);
    assert.deepEqual(names(await agent.get('/api/files?path=/a/b/')), ['c.txt']);
  });

  it('rejects duplicates without overwriting the original', async () => {
    const { agent } = await h.createUser('dupe@example.com');
    await h.uploadFile(agent, { name: 'same.txt', content: Buffer.from('first') }).expect(201);
    const blobs = h.storedBlobCount();
    const res = await h.uploadFile(agent, { name: 'same.txt', content: Buffer.from('second') });
    assert.equal(res.status, 409);
    assert.equal(h.storedBlobCount(), blobs, 'rejected upload leaves no blob behind');
  });

  for (const [label, name, path] of [
    ['traversal name', '..', '/'],
    ['slash in name', 'a/b', '/'],
    ['control chars', 'bad\u0000name', '/'],
    ['traversal path', 'x', '/../etc/'],
  ]) {
    it(`rejects invalid names: ${label}`, async () => {
      const { agent } = await h.createUser(`bad-${label.replace(/\W/g, '')}@example.com`);
      await h.uploadFile(agent, { name, path }).expect(400);
    });
  }

  it('enforces the per-file size limit', async () => {
    const { agent } = await h.createUser('big@example.com');
    await h.uploadFile(agent, { content: Buffer.alloc(10), size: 3 * 1024 * 1024 }).expect(400);
    await h.uploadFile(agent, { content: Buffer.alloc(3 * 1024 * 1024), size: 10 }).expect(413);
  });

  it('enforces the storage quota', async () => {
    const { agent } = await h.createUser('quota@example.com');
    const twoMb = Buffer.alloc(2 * 1024 * 1024 - 1024);
    await h.uploadFile(agent, { name: '1', content: twoMb }).expect(201);
    await h.uploadFile(agent, { name: '2', content: twoMb }).expect(201);
    await h.uploadFile(agent, { name: '3', content: twoMb }).expect(413);
    const stats = await agent.get('/api/files/stats');
    assert.equal(stats.body.files, 2);
  });
});

describe('ownership', () => {
  it("keeps other users away from a user's files", async () => {
    const { agent: alice } = await h.createUser('a-owner@example.com');
    const { agent: mallory } = await h.createUser('mallory@example.com');
    const { body: file } = await h.uploadFile(alice, { name: 'secret.txt' }).expect(201);

    await mallory.get(`/api/files/${file._id}/content`).expect(404);
    await mallory.delete(`/api/files/${file._id}`).expect(404);
    await mallory.patch(`/api/files/${file._id}`).send({ name: 'pwned' }).expect(404);
    await mallory.post(`/api/files/${file._id}/links`).send({}).expect(404);
    await mallory.post('/api/files/bulk-delete').send({ ids: [file._id] }).expect(200);
    await alice.get(`/api/files/${file._id}/content`).expect(200);
  });
});

describe('folders, rename and move', () => {
  it('renames a folder and rewrites every descendant path', async () => {
    const { agent } = await h.createUser('mover@example.com');
    await h.uploadFile(agent, { name: 'deep.txt', path: '/old/inner/' }).expect(201);
    const old = (await agent.get('/api/files?path=/')).body.items.find((i) => i.name === 'old');

    await agent.patch(`/api/files/${old._id}`).send({ name: 'new' }).expect(200);
    assert.deepEqual(names(await agent.get('/api/files?path=/new/inner/')), ['deep.txt']);
    assert.deepEqual(names(await agent.get('/api/files?path=/old/inner/')), []);
  });

  it('moves a file between folders and refuses name clashes', async () => {
    const { agent } = await h.createUser('mover2@example.com');
    await agent.post('/api/files/folders').send({ name: 'dest', path: '/' }).expect(201);
    const { body: f } = await h.uploadFile(agent, { name: 'f.txt' }).expect(201);
    await h.uploadFile(agent, { name: 'g.txt', path: '/dest/' }).expect(201);

    await agent.patch(`/api/files/${f._id}`).send({ path: '/dest/' }).expect(200);
    assert.deepEqual(names(await agent.get('/api/files?path=/dest/')), ['f.txt', 'g.txt']);

    const { body: g2 } = await h.uploadFile(agent, { name: 'g.txt' }).expect(201);
    await agent.patch(`/api/files/${g2._id}`).send({ path: '/dest/' }).expect(409);
    await agent.patch(`/api/files/${g2._id}`).send({ path: '/missing/' }).expect(400);
  });

  it('refuses to move a folder into itself', async () => {
    const { agent } = await h.createUser('loop@example.com');
    await agent.post('/api/files/folders').send({ name: 'p', path: '/' }).expect(201);
    await agent.post('/api/files/folders').send({ name: 'c', path: '/p/' }).expect(201);
    const p = (await agent.get('/api/files?path=/')).body.items[0];
    await agent.patch(`/api/files/${p._id}`).send({ path: '/p/c/' }).expect(400);
  });

  it('deletes a folder with all contents and blobs', async () => {
    const { agent } = await h.createUser('deleter@example.com');
    await h.uploadFile(agent, { name: '1.txt', path: '/tree/' }).expect(201);
    await h.uploadFile(agent, { name: '2.txt', path: '/tree/sub/' }).expect(201);
    const blobs = h.storedBlobCount();
    const tree = (await agent.get('/api/files?path=/')).body.items[0];

    const res = await agent.delete(`/api/files/${tree._id}`).expect(200);
    assert.equal(res.body.deleted, 4); // tree, sub, 1.txt, 2.txt
    assert.equal(h.storedBlobCount(), blobs - 2);
    assert.deepEqual(names(await agent.get('/api/files?path=/tree/sub/')), []);
  });
});
