import { createOfflinePack, putOfflinePack } from './offlineCourseStorage.js';

let downloading = false;

/** Fetch/validate first; keep the old pack untouched if either lookup fails. */
export async function downloadOfflineCourse(course, { loadHoles, loadGraphics, save = putOfflinePack, onProgress = (_stage) => {} }) {
  if (downloading) throw new Error('A course download is already running. Wait for it to finish before retrying.');
  downloading = true;
  try {
    onProgress({ step: 1, label: 'Finding mapped holes. Provider fallbacks can take a minute…' });
    const holes = await loadHoles(course);
    createOfflinePack(course, holes); // Reject missing/estimated holes before optional graphics work.
    onProgress({ step: 2, label: 'Downloading available vector map features…' });
    let graphics = null;
    try { graphics = await loadGraphics(course); } catch { /* Hole data is still useful offline. */ }
    let pack;
    try {
      pack = createOfflinePack(course, holes, graphics);
    } catch {
      // An oversized or malformed *optional* vector layer must not discard
      // valid mapped holes or overwrite an existing download.
      pack = createOfflinePack(course, holes);
    }
    onProgress({ step: 3, label: 'Saving and verifying the offline copy…' });
    const verified = await save(pack);
    onProgress({ step: 4, label: 'Download verified on this device.' });
    return verified;
  } finally {
    downloading = false;
  }
}
