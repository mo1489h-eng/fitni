/**
 * Minimal IndexedDB KV layer for Fitni workout snapshots & sync queue.
 * Falls back to localStorage when IndexedDB is unavailable (SSR / private mode).
 */

const DB_NAME = "fitni-workout-v1";
const STORE = "kv";
const LS_PREFIX = "fitni_idb_fallback:";

function canUseIdb(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGet(key: string): Promise<string | undefined> {
  if (!canUseIdb()) {
    const v = localStorage.getItem(LS_PREFIX + key);
    return v ?? undefined;
  }
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as string | undefined);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function idbSet(key: string, value: string): Promise<void> {
  if (!canUseIdb()) {
    try {
      localStorage.setItem(LS_PREFIX + key, value);
    } catch {
      /* quota */
    }
    return;
  }
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbDel(key: string): Promise<void> {
  if (!canUseIdb()) {
    localStorage.removeItem(LS_PREFIX + key);
    return;
  }
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}
