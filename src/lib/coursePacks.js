import { allCourses, cachedHoles, addCourse, cacheCourseHoles, getCourse } from '@/lib/courses';

const FORMAT = 'apex.golf.coursepack.v1';
const MAX_FILE_BYTES = 3 * 1024 * 1024;
const validPosition = (p) => Array.isArray(p) && p.length === 2 &&
  Number.isFinite(p[0]) && Number.isFinite(p[1]) &&
  p[0] >= -90 && p[0] <= 90 && p[1] >= -180 && p[1] <= 180;

function safeHole(h, courseId, name, index) {
  if (!h || !validPosition(h.tee) || !validPosition(h.pin)) throw new Error('A hole is missing valid tee/pin coordinates.');
  const layup = validPosition(h.layup) ? h.layup : [
    (h.tee[0] + h.pin[0]) / 2, (h.tee[1] + h.pin[1]) / 2,
  ];
  const par = Number(h.par);
  if (!Number.isInteger(par) || par < 3 || par > 6) throw new Error('Hole par must be from 3 to 6.');
  return {
    courseId, courseName: name, number: index + 1, par,
    tee: [...h.tee], layup: [...layup], pin: [...h.pin],
    yards: Number.isFinite(Number(h.yards)) && Number(h.yards) > 0 ? Math.round(Number(h.yards)) : 0,
    source: 'user-mapped', manuallyMapped: true, estimated: false,
  };
}

export function exportCoursePacks() {
  const courses = {};
  for (const course of allCourses()) {
    const holes = cachedHoles(course.id);
    if (!holes?.length || holes.some((hole) => hole.estimated)) continue;
    courses[course.id] = {
      id: course.id, name: course.name, location: course.location || '', center: course.center,
      holes: holes.map((hole) => ({
        par: hole.par, tee: hole.tee, layup: hole.layup, pin: hole.pin, yards: hole.yards,
      })),
    };
  }
  return JSON.stringify({ format: FORMAT, exportedAt: new Date().toISOString(), courses }, null, 2);
}

export function downloadCoursePacks() {
  const content = exportCoursePacks();
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Apex-Golf-Courses.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function importCoursePacks(file) {
  if (!file || file.size > MAX_FILE_BYTES) throw new Error('Choose a JSON course pack smaller than 3 MB.');
  const input = JSON.parse(await file.text());
  if (input.format !== FORMAT || !input.courses || typeof input.courses !== 'object') {
    throw new Error('This is not an APEX Golf course pack.');
  }
  const entries = Object.entries(input.courses).slice(0, 100);
  let imported = 0;
  for (const [key, value] of entries) {
    if (!value || typeof value.name !== 'string' || !value.name.trim() ||
        !validPosition(value.center) || !Array.isArray(value.holes) ||
        value.holes.length < 1 || value.holes.length > 18) continue;
    const name = value.name.trim().slice(0, 120);
    let id = String(value.id || key).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 65);
    if (!id || getCourse(id)) id = 'imported-' + Date.now() + '-' + imported;
    const holes = value.holes.map((hole, i) => safeHole(hole, id, name, i));
    const course = { id, name, location: String(value.location || 'Imported course').slice(0, 100),
      center: [...value.center], source: 'user-mapped' };
    addCourse(course);
    cacheCourseHoles(course, holes);
    imported += 1;
  }
  if (!imported) throw new Error('No valid golf holes were found in that pack.');
  return imported;
}

export function saveCustomCourse({ name, center, holes }) {
  if (!name?.trim() || !validPosition(center) || !holes?.length || holes.length > 18) {
    throw new Error('Enter a course name and map at least one complete hole.');
  }
  const id = 'manual-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const courseName = name.trim().slice(0, 120);
  const normalized = holes.map((hole, i) => safeHole(hole, id, courseName, i));
  const course = { id, name: courseName, center: [...center],
    location: 'Your mapped course', source: 'user-mapped' };
  addCourse(course);
  cacheCourseHoles(course, normalized);
  return course;
}
