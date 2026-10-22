/**
 * Save user-adjusted tee / landing / green positions per course and hole.
 * This is a local shot plan, not verified survey geometry.
 */
const KEY = 'apex_shot_plans_v1';
const valid = (point) => Array.isArray(point) && point.length === 2 && point.every((n) => Number.isFinite(n));
const keyOf = (courseId, holeNumber) => String(courseId || '') + '/' + String(holeNumber || '');

export function loadShotPlan(courseId, holeNumber) {
  if (!courseId || !holeNumber) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}')[keyOf(courseId, holeNumber)];
    if (saved && valid(saved.tee) && valid(saved.layup) && valid(saved.pin)) return saved;
  } catch { /* storage unavailable */ }
  return null;
}

export function saveShotPlan(courseId, holeNumber, coords) {
  if (!courseId || !holeNumber || !coords
      || !valid(coords.tee) || !valid(coords.layup) || !valid(coords.pin)) return false;
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}');
    const key = keyOf(courseId, holeNumber);
    if (Object.keys(all).length >= 500 && !Object.prototype.hasOwnProperty.call(all, key)) {
      delete all[Object.keys(all)[0]];
    }
    all[key] = { tee: coords.tee, layup: coords.layup, pin: coords.pin };
    localStorage.setItem(KEY, JSON.stringify(all));
    return true;
  } catch { return false; }
}
