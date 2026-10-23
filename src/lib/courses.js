/**
 * Course library.
 *
 * A course is only a name, location and map position: its holes come from real
 * OpenStreetMap geometry (see osmCourses.js) and are then cached on this device,
 * so switching holes stays instant and works with a weak signal on the course.
 */

import { fetchHoles } from '@/lib/osmCourses';

export const HOLE_PARS = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 3, 4, 4, 5, 3, 4, 4, 5];
export const HOLE_COUNT = HOLE_PARS.length;

const COURSES_KEY = 'apex_golf_courses_v1';
const HOLES_KEY = 'apex_golf_holes_v1';
const FAVORITES_KEY = 'apex_golf_favourite_courses_v1';

// Course library contains only courses the golfer has explicitly searched,
// selected or imported. No pre-installed demonstration courses.
export const FEATURED_COURSES = [];

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

let customCourses = readJson(COURSES_KEY, []);
const holeCache = readJson(HOLES_KEY, {});

export function allCourses() {
  return [...customCourses];
}

export function getCourse(courseId) {
  return allCourses().find((course) => course.id === courseId) ?? null;
}

/** Player-selected favourites, separate from automatically remembered searches. */
export function getFavoriteCourseIds() {
  const value = readJson(FAVORITES_KEY, []);
  return Array.isArray(value) ? value.filter((id) => typeof id === 'string') : [];
}

export function isFavoriteCourse(courseId) {
  return getFavoriteCourseIds().includes(courseId);
}

export function saveFavoriteCourse(course) {
  if (!course?.id || !course.name || !Array.isArray(course.center)) {
    throw new Error('Select a golf course before saving it.');
  }
  // Ensures previously searched courses remain selectable after reopening the app.
  addCourse(course);
  const ids = getFavoriteCourseIds();
  if (!ids.includes(course.id)) {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([course.id, ...ids].slice(0, 100)));
    } catch {
      throw new Error('This device cannot store the course. Check available storage.');
    }
  }
  return true;
}

export function removeFavoriteCourse(courseId) {
  const ids = getFavoriteCourseIds().filter((id) => id !== courseId);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  return ids;
}

/** Keeps searched courses on the device so they stay one tap away. */
export function addCourse(course) {
  const existing = getCourse(course.id);
  if (existing) return existing;
  customCourses = [course, ...customCourses].slice(0, 100);
  try {
    localStorage.setItem(COURSES_KEY, JSON.stringify(customCourses));
  } catch {
    /* storage blocked — the course still works this session */
  }
  return course;
}

export function cachedHoles(courseId) {
  return holeCache[courseId]?.holes ?? null;
}

function rememberHoles(course, holes) {
  holeCache[course.id] = { name: course.name, saved: Date.now(), holes };
  try {
    localStorage.setItem(HOLES_KEY, JSON.stringify(holeCache));
  } catch {
    /* too big for storage — holes stay in memory */
  }
}

/** Store a user-created or imported mapped course for offline hole navigation. */
export function cacheCourseHoles(course, holes) {
  if (!course?.id || !Array.isArray(holes) || !holes.length) {
    throw new Error('Cannot cache a course without valid holes.');
  }
  rememberHoles(course, holes);
}

export async function loadCourseHoles(course) {
  const cached = cachedHoles(course.id);
  if (cached?.length) return cached;

  const started = performance.now();
  const holes = await fetchHoles(course);
  if (!holes.length) throw new Error('No hole layout is mapped for this course yet.');

  const loadMs = Number((performance.now() - started).toFixed(0));
  // An estimated layout is only for this session: never let it stand in for the
  // real geometry once the map server answers again.
  if (!holes.some((hole) => hole.estimated)) rememberHoles(course, holes);
  return holes.map((hole) => ({ ...hole, loadMs }));
}

export function courseSummary(courseId) {
  const holes = cachedHoles(courseId);
  if (!holes?.length) return null;
  return {
    holes: holes.length,
    par: holes.reduce((sum, hole) => sum + hole.par, 0),
    yards: holes.reduce((sum, hole) => sum + hole.yards, 0),
  };
}
