const DB_NAME = 'apex-offline-courses';
const FORMAT = 'apex.offline-course.v1';
export const MAX_PACK_BYTES = 8 * 1024 * 1024;
const position = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)
  && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180;

/** Validate before storage and after reading: never mark guessed/corrupt data ready. */
export function validateOfflinePack(pack) {
  const course = pack?.course;
  if (pack?.format !== FORMAT || !course || typeof course.id !== 'string' || !course.id || pack.id !== course.id
      || typeof course.name !== 'string' || !course.name.trim() || !position(course.center)) {
    throw new Error('This is not a valid APEX offline course download.');
  }
  if (!Array.isArray(pack.holes) || !pack.holes.length || pack.holes.length > 54) {
    throw new Error('No mapped holes were found. This course cannot be downloaded yet.');
  }
  const numbers = new Set();
  for (const hole of pack.holes) {
    if (hole.estimated || !Number.isInteger(hole.number) || hole.number < 1 || hole.number > 54
        || numbers.has(hole.number) || !Number.isInteger(hole.par) || hole.par < 3 || hole.par > 6
        || !position(hole.tee) || !position(hole.pin) || !position(hole.layup)
        || !Number.isFinite(hole.yards) || hole.yards <= 0) {
      throw new Error('The mapped holes are incomplete or invalid. Your previous download has not been replaced.');
    }
    numbers.add(hole.number);
  }
  if (pack.graphics != null && (typeof pack.graphics !== 'object' || Array.isArray(pack.graphics)
      || Object.values(pack.graphics).some((g) => g?.type !== 'FeatureCollection' || !Array.isArray(g.features)))) {
    throw new Error('The offline vector map is invalid.');
  }
  if (!Number.isFinite(pack.savedAt) || pack.savedAt <= 0) throw new Error('The download has an invalid date.');
  if (new TextEncoder().encode(JSON.stringify(pack)).byteLength > MAX_PACK_BYTES) {
    throw new Error('This course exceeds the 8 MB offline-download limit.');
  }
  return pack;
}

export function createOfflinePack(course, holes, graphics = null) {
  return validateOfflinePack({ format: FORMAT, id: course.id, course: { ...course },
    holes, graphics, savedAt: Date.now() });
}

/** @returns {Promise<IDBDatabase>} */
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Offline storage is unavailable on this device.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('packs', { keyPath: 'id' });
    request.onerror = () => reject(new Error('Cannot open offline storage. Check device storage and browser privacy settings.'));
    request.onblocked = () => reject(new Error('Close other APEX tabs and retry the download.'));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
}

/** Resolve only on transaction completion, not merely a successful put request. */
/** @param {IDBTransactionMode} mode
 * @param {(store: IDBObjectStore) => IDBRequest} operation
 * @returns {Promise<any>} */
async function transaction(mode, operation) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('packs', mode);
      let value;
      const request = operation(tx.objectStore('packs'));
      request.onsuccess = () => { value = request.result; };
      tx.oncomplete = () => resolve(value);
      tx.onabort = tx.onerror = () => reject(new Error('The course could not be saved. Device storage may be full or blocked; an existing download is kept.'));
    });
  } finally {
    db.close();
  }
}

export async function getOfflinePack(id) {
  const pack = await transaction('readonly', (store) => store.get(id));
  return pack ? validateOfflinePack(pack) : null;
}

export async function listOfflinePacks() {
  const packs = await transaction('readonly', (store) => store.getAll());
  return packs.map(validateOfflinePack).sort((a, b) => b.savedAt - a.savedAt);
}

export async function putOfflinePack(pack) {
  validateOfflinePack(pack);
  // One atomic record replaces the previous version only after a successful commit.
  await transaction('readwrite', (store) => store.put({ ...pack, id: pack.course.id }));
  const verified = await getOfflinePack(pack.course.id);
  if (!verified || verified.savedAt !== pack.savedAt) throw new Error('Could not verify the saved download. Retry before going offline.');
  return verified;
}

export async function removeOfflinePack(id) {
  await transaction('readwrite', (store) => store.delete(id));
}
