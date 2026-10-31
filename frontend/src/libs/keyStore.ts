/**
 * Keeps the unlocked account keys in IndexedDB so a page reload doesn't require the
 * password again. The private key is stored as a non-extractable CryptoKey: scripts can
 * use it but cannot read its raw bytes. Cleared on logout.
 */
import type { AccountKeys } from "./crypto";

const DB_NAME = "secu-share";
const STORE = "account-keys";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function saveAccountKeys(userId: string, keys: AccountKeys): Promise<void> {
  await run("readwrite", (s) => s.put(keys, userId));
}

export async function loadAccountKeys(userId: string): Promise<AccountKeys | null> {
  try {
    const keys = await run<AccountKeys | undefined>("readonly", (s) => s.get(userId));
    return keys?.privateKey && keys?.publicKey ? keys : null;
  } catch {
    return null;
  }
}

export async function clearAccountKeys(): Promise<void> {
  try {
    await run("readwrite", (s) => s.clear());
  } catch {
    // Nothing stored, or storage unavailable
  }
}
