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

export const FEATURED_COURSES = [
  {
    id: 'tpc-sawgrass',
    name: 'TPC Sawgrass',
    location: 'Ponte Vedra Beach, Florida',
    layout: 'Stadium',
    center: [30.1987, -81.3994],
    osmType: 'relation',
    osmId: 1783123,
  },
  {
    id: 'pebble-beach',
    name: 'Pebble Beach',
    location: 'Monterey, California',
    layout: 'Pebble Beach',
    center: [36.5682, -121.9497],
  },
  {
    id: 'st-andrews',
    name: 'St Andrews Old',
    location: 'Fife, Scotland',
    layout: 'Old',
    center: [56.3436, -2.8029],
  },
  {
    id: 'royal-melbourne',
    name: 'Royal Melbourne',
    location: 'Black Rock, Victoria',
    layout: 'West',
    center: [-37.9686, 145.0271],
  },
  {
    id: 'barnbougle',
    name: 'Barnbougle Dunes',
    location: 'Bridport, Tasmania',
    layout: 'Dunes',
    center: [-40.9633, 147.2833],
    osmType: 'way',
    osmId: 194005453,
  },
];

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
  return [...FEATURED_COURSES, ...customCourses.filter((c) => !FEATURED_COURSES.some((f) => f.id === c.id))];
}

export function getCourse(courseId) {
  return allCourses().find((course) => course.id === courseId) ?? null;
}

/** Keeps searched courses on the device so they stay one tap away. */
export function addCourse(course) {
  const existing = getCourse(course.id);
  if (existing) return existing;
  customCourses = [course, ...customCourses].slice(0, 12);
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