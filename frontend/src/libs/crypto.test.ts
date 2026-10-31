import { describe, it, expect } from "vitest";
import {
  CHUNK_SIZE,
  DecryptionError,
  createAccountKeys,
  decryptFile,
  deriveSecrets,
  encryptFile,
  exportFileKey,
  generateFileKey,
  importFileKey,
  rewrapPrivateKey,
  unlockAccountKeys,
  unwrapFileKey,
  wrapFileKey,
} from "./crypto";

const bytes = async (b: Blob) => new Uint8Array(await b.arrayBuffer());
// Deep equality on multi-MB arrays is slow; compare directly
const sameBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);

function randomBlob(size: number) {
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i += 65536) crypto.getRandomValues(data.subarray(i, Math.min(i + 65536, size)));
  return { data, blob: new Blob([data]) };
}

async function tamper(blob: Blob, edit: (b: Uint8Array) => Uint8Array) {
  return new Blob([edit(new Uint8Array(await blob.arrayBuffer()))]);
}

describe("account secrets", () => {
  it("are deterministic per email and password, and case-insensitive in the email", async () => {
    const a = await deriveSecrets("Alice@Example.com", "correct horse");
    const b = await deriveSecrets("alice@example.com", "correct horse");
    const c = await deriveSecrets("alice@example.com", "wrong horse");
    expect(a.authHash).toBe(b.authHash);
    expect(a.authHash).not.toBe(c.authHash);
    expect(a.authHash).toMatch(/^[A-Za-z0-9+/]{43}=$/);
  });

  it("unlock the private key only with the right password", async () => {
    const right = await deriveSecrets("bob@example.com", "pw-1");
    const wrong = await deriveSecrets("bob@example.com", "pw-2");
    const { material } = await createAccountKeys(right.wrappingKey);

    const keys = await unlockAccountKeys(material, right.wrappingKey);
    expect(keys.privateKey.extractable).toBe(false);
    await expect(unlockAccountKeys(material, wrong.wrappingKey)).rejects.toBeInstanceOf(DecryptionError);
  });

  it("survive a password change", async () => {
    const oldS = await deriveSecrets("carol@example.com", "old");
    const newS = await deriveSecrets("carol@example.com", "new");
    const { material, keys } = await createAccountKeys(oldS.wrappingKey);
    const fileKey = await generateFileKey();
    const wrapped = await wrapFileKey(fileKey, keys.publicKey);

    const rewrapped = { ...material, ...(await rewrapPrivateKey(material, oldS.wrappingKey, newS.wrappingKey)) };
    const unlocked = await unlockAccountKeys(rewrapped, newS.wrappingKey);
    const recovered = await unwrapFileKey(wrapped, unlocked.privateKey);
    expect(await exportFileKey(recovered)).toBe(await exportFileKey(fileKey));
    await expect(unlockAccountKeys(rewrapped, oldS.wrappingKey)).rejects.toThrow();
  });
});

describe("file keys", () => {
  it("can only be unwrapped by the intended recipient", async () => {
    const alice = (await createAccountKeys((await deriveSecrets("a@x.io", "a")).wrappingKey)).keys;
    const bob = (await createAccountKeys((await deriveSecrets("b@x.io", "b")).wrappingKey)).keys;
    const fileKey = await generateFileKey();

    const forBob = await wrapFileKey(fileKey, bob.publicKey);
    expect(await exportFileKey(await unwrapFileKey(forBob, bob.privateKey))).toBe(await exportFileKey(fileKey));
    await expect(unwrapFileKey(forBob, alice.privateKey)).rejects.toBeInstanceOf(DecryptionError);
  });

  it("round-trip through a link fragment", async () => {
    const key = await generateFileKey();
    const encoded = await exportFileKey(key);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await exportFileKey(await importFileKey(encoded))).toBe(encoded);
    await expect(importFileKey("too-short")).rejects.toBeInstanceOf(DecryptionError);
  });
});

describe("file content", () => {
  for (const size of [0, 1, CHUNK_SIZE - 1, CHUNK_SIZE, CHUNK_SIZE + 1, 3 * CHUNK_SIZE + 12345]) {
    it(`round-trips ${size} bytes`, async () => {
      const key = await generateFileKey();
      const { data, blob } = randomBlob(size);
      const encrypted = await encryptFile(blob, key);
      expect(encrypted.size).toBe(17 + size + 16 * Math.max(1, Math.ceil(size / CHUNK_SIZE)));
      const decrypted = await decryptFile(encrypted, key, "text/plain");
      expect(decrypted.type).toBe("text/plain");
      expect(sameBytes(await bytes(decrypted), data)).toBe(true);
    });
  }

  it("produces different ciphertext for the same input", async () => {
    const key = await generateFileKey();
    const { blob } = randomBlob(100);
    expect(await bytes(await encryptFile(blob, key))).not.toEqual(await bytes(await encryptFile(blob, key)));
  });

  it("rejects the wrong key", async () => {
    const encrypted = await encryptFile(randomBlob(100).blob, await generateFileKey());
    await expect(decryptFile(encrypted, await generateFileKey())).rejects.toBeInstanceOf(DecryptionError);
  });

  it("detects a flipped bit", async () => {
    const key = await generateFileKey();
    const encrypted = await encryptFile(randomBlob(1000).blob, key);
    const bad = await tamper(encrypted, (b) => {
      b[500] ^= 1;
      return b;
    });
    await expect(decryptFile(bad, key)).rejects.toBeInstanceOf(DecryptionError);
  });

  it("detects truncation at a chunk boundary", async () => {
    const key = await generateFileKey();
    const encrypted = await encryptFile(randomBlob(2 * CHUNK_SIZE + 10).blob, key);
    const truncated = await tamper(encrypted, (b) => b.slice(0, 17 + 2 * (CHUNK_SIZE + 16)));
    await expect(decryptFile(truncated, key)).rejects.toBeInstanceOf(DecryptionError);
  });

  it("detects reordered chunks", async () => {
    const key = await generateFileKey();
    const encrypted = await encryptFile(randomBlob(3 * CHUNK_SIZE).blob, key);
    const swapped = await tamper(encrypted, (b) => {
      const c = CHUNK_SIZE + 16;
      const out = b.slice();
      out.set(b.subarray(17 + c, 17 + 2 * c), 17);
      out.set(b.subarray(17, 17 + c), 17 + c);
      return out;
    });
    await expect(decryptFile(swapped, key)).rejects.toBeInstanceOf(DecryptionError);
  });

  it("rejects data that isn't in the expected format", async () => {
    await expect(decryptFile(new Blob([new Uint8Array(64)]), await generateFileKey())).rejects.toThrow("Unsupported file format");
  });
});
