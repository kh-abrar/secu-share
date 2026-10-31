/**
 * End-to-end encryption, entirely in the browser (WebCrypto).
 *
 * Account
 *   master   = PBKDF2-SHA256(password, "secu-share/v1/" + email, 600k)
 *   authHash = HKDF(master, "auth")      -> sent to the server instead of the password
 *   wrapKey  = HKDF(master, "private-key-encryption") -> encrypts the RSA private key
 *   The server stores the public key and the *encrypted* private key only.
 *
 * Files
 *   Each file gets a random AES-256-GCM key. Content is encrypted in chunks; every chunk
 *   authenticates its index and whether it is the last one, so chunks cannot be
 *   reordered, dropped or appended without detection.
 *   The file key is stored wrapped (RSA-OAEP) with the owner's public key, and with each
 *   direct-share recipient's public key. Share links carry it in the URL fragment,
 *   which browsers never send to servers.
 */

const subtle = globalThis.crypto.subtle;
const encoder = new TextEncoder();

export const PBKDF2_ITERATIONS = 600_000;
const KDF_SALT_PREFIX = "secu-share/v1/";
const RSA_PARAMS: RsaHashedKeyGenParams = {
  name: "RSA-OAEP",
  modulusLength: 3072,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256",
};
const RSA_IMPORT: RsaHashedImportParams = { name: "RSA-OAEP", hash: "SHA-256" };

// Encrypted file format: header || chunk_0 || ... || chunk_n
//   header = "SSE1" (4) | version (1) | chunk size u32 BE (4) | nonce prefix (8)
//   chunk_i = AES-GCM(key, iv = prefix || u32be(i), aad = header || u32be(i) || last)
export const CHUNK_SIZE = 1024 * 1024;
const MAGIC = [0x53, 0x53, 0x45, 0x31];
const FORMAT_VERSION = 1;
const HEADER_LEN = 17;
const TAG_LEN = 16;
const MAX_CHUNK_SIZE = 64 * 1024 * 1024;

export class DecryptionError extends Error {
  constructor(message = "This file could not be decrypted. The key is wrong or the data was modified.") {
    super(message);
    this.name = "DecryptionError";
  }
}

// ---------- encoding ----------

export function toBase64(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const toBase64Url = (data: ArrayBuffer) => toBase64(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromBase64Url = (s: string) => fromBase64(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "="));

const randomBytes = (n: number) => globalThis.crypto.getRandomValues(new Uint8Array(n));

// ---------- account keys ----------

export interface AccountKeyMaterial {
  publicKey: string;
  encryptedPrivateKey: string;
  privateKeyIv: string;
}

export interface AccountKeys {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface DerivedSecrets {
  /** Sent to the server in place of the password */
  authHash: string;
  /** Encrypts/decrypts the account private key. Never leaves the browser. */
  wrappingKey: CryptoKey;
}

export async function deriveSecrets(email: string, password: string): Promise<DerivedSecrets> {
  const salt = encoder.encode(KDF_SALT_PREFIX + email.trim().toLowerCase());
  const pw = await subtle.importKey("raw", encoder.encode(password.normalize("NFKC")), "PBKDF2", false, ["deriveBits"]);
  const master = await subtle.deriveBits({ name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" }, pw, 256);
  const hkdf = await subtle.importKey("raw", master, "HKDF", false, ["deriveBits", "deriveKey"]);
  const hkdfParams = (info: string): HkdfParams => ({ name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: encoder.encode(info) });

  const authBits = await subtle.deriveBits(hkdfParams("auth"), hkdf, 256);
  const wrappingKey = await subtle.deriveKey(
    hkdfParams("private-key-encryption"),
    hkdf,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"]
  );
  return { authHash: toBase64(authBits), wrappingKey };
}

/** Creates a new account key pair, returning the server-side material and usable keys. */
export async function createAccountKeys(wrappingKey: CryptoKey): Promise<{ material: AccountKeyMaterial; keys: AccountKeys }> {
  const pair = (await subtle.generateKey(RSA_PARAMS, true, ["wrapKey", "unwrapKey"])) as CryptoKeyPair;
  const iv = randomBytes(12);
  const material: AccountKeyMaterial = {
    publicKey: toBase64(await subtle.exportKey("spki", pair.publicKey)),
    encryptedPrivateKey: toBase64(await subtle.wrapKey("pkcs8", pair.privateKey, wrappingKey, { name: "AES-GCM", iv })),
    privateKeyIv: toBase64(iv),
  };
  // Hand back a non-extractable copy so the raw private key can't be read out later
  return { material, keys: await unlockAccountKeys(material, wrappingKey) };
}

export async function unlockAccountKeys(material: AccountKeyMaterial, wrappingKey: CryptoKey, extractable = false): Promise<AccountKeys> {
  let privateKey: CryptoKey;
  try {
    privateKey = await subtle.unwrapKey(
      "pkcs8",
      fromBase64(material.encryptedPrivateKey),
      wrappingKey,
      { name: "AES-GCM", iv: fromBase64(material.privateKeyIv) },
      RSA_IMPORT,
      extractable,
      ["unwrapKey"]
    );
  } catch {
    throw new DecryptionError("Could not unlock your encryption keys");
  }
  return { privateKey, publicKey: await importPublicKey(material.publicKey) };
}

/** Re-encrypts the private key under a new password-derived key (password change). */
export async function rewrapPrivateKey(material: AccountKeyMaterial, oldKey: CryptoKey, newKey: CryptoKey) {
  const { privateKey } = await unlockAccountKeys(material, oldKey, true);
  const iv = randomBytes(12);
  return {
    encryptedPrivateKey: toBase64(await subtle.wrapKey("pkcs8", privateKey, newKey, { name: "AES-GCM", iv })),
    privateKeyIv: toBase64(iv),
  };
}

export const importPublicKey = (spkiBase64: string) =>
  subtle.importKey("spki", fromBase64(spkiBase64), RSA_IMPORT, true, ["wrapKey"]);

// ---------- file keys ----------

export const generateFileKey = () =>
  subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]) as Promise<CryptoKey>;

export async function wrapFileKey(fileKey: CryptoKey, publicKey: CryptoKey): Promise<string> {
  return toBase64(await subtle.wrapKey("raw", fileKey, publicKey, { name: "RSA-OAEP" }));
}

export async function unwrapFileKey(wrapped: string, privateKey: CryptoKey): Promise<CryptoKey> {
  try {
    return await subtle.unwrapKey("raw", fromBase64(wrapped), privateKey, { name: "RSA-OAEP" }, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
  } catch {
    throw new DecryptionError("Could not unlock this file's key");
  }
}

/** For share-link fragments */
export async function exportFileKey(fileKey: CryptoKey): Promise<string> {
  return toBase64Url(await subtle.exportKey("raw", fileKey));
}

export async function importFileKey(encoded: string): Promise<CryptoKey> {
  let raw: Uint8Array<ArrayBuffer>;
  try {
    raw = fromBase64Url(encoded);
  } catch {
    throw new DecryptionError("The link's key is malformed");
  }
  if (raw.length !== 32) throw new DecryptionError("The link's key is malformed");
  return subtle.importKey("raw", raw, "AES-GCM", true, ["encrypt", "decrypt"]);
}

// ---------- file content ----------

function chunkIv(prefix: Uint8Array, index: number) {
  const iv = new Uint8Array(12);
  iv.set(prefix);
  new DataView(iv.buffer).setUint32(8, index);
  return iv;
}

function chunkAad(header: Uint8Array, index: number, last: boolean) {
  const aad = new Uint8Array(header.length + 5);
  aad.set(header);
  new DataView(aad.buffer).setUint32(header.length, index);
  aad[header.length + 4] = last ? 1 : 0;
  return aad;
}

type Progress = (fraction: number) => void;

export async function encryptFile(file: Blob, key: CryptoKey, onProgress?: Progress): Promise<Blob> {
  const header = new Uint8Array(HEADER_LEN);
  header.set(MAGIC);
  header[4] = FORMAT_VERSION;
  new DataView(header.buffer).setUint32(5, CHUNK_SIZE);
  const prefix = randomBytes(8);
  header.set(prefix, 9);

  const parts: BlobPart[] = [header];
  const count = Math.max(1, Math.ceil(file.size / CHUNK_SIZE)); // empty files still get one chunk
  for (let i = 0; i < count; i++) {
    const plain = await file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE).arrayBuffer();
    parts.push(
      await subtle.encrypt({ name: "AES-GCM", iv: chunkIv(prefix, i), additionalData: chunkAad(header, i, i === count - 1) }, key, plain)
    );
    onProgress?.((i + 1) / count);
  }
  return new Blob(parts, { type: "application/octet-stream" });
}

export async function decryptFile(data: Blob, key: CryptoKey, type = "application/octet-stream", onProgress?: Progress): Promise<Blob> {
  if (data.size < HEADER_LEN + TAG_LEN) throw new DecryptionError();
  const header = new Uint8Array(await data.slice(0, HEADER_LEN).arrayBuffer());
  if (!MAGIC.every((b, i) => header[i] === b) || header[4] !== FORMAT_VERSION) {
    throw new DecryptionError("Unsupported file format");
  }
  const chunkSize = new DataView(header.buffer).getUint32(5);
  if (chunkSize < 1 || chunkSize > MAX_CHUNK_SIZE) throw new DecryptionError();
  const prefix = header.slice(9, 17);

  const encChunk = chunkSize + TAG_LEN;
  const count = Math.ceil((data.size - HEADER_LEN) / encChunk);
  const parts: BlobPart[] = [];
  for (let i = 0; i < count; i++) {
    const start = HEADER_LEN + i * encChunk;
    const cipher = await data.slice(start, Math.min(start + encChunk, data.size)).arrayBuffer();
    try {
      parts.push(
        await subtle.decrypt({ name: "AES-GCM", iv: chunkIv(prefix, i), additionalData: chunkAad(header, i, i === count - 1) }, key, cipher)
      );
    } catch {
      throw new DecryptionError();
    }
    onProgress?.((i + 1) / count);
  }
  return new Blob(parts, { type });
}
