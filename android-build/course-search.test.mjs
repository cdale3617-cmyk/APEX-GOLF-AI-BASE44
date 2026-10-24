import test from 'node:test';
import assert from 'node:assert/strict';
import { findGolfCourses } from '../src/lib/courseSearch.js';
import { mergeCourseSources, photonBounds } from '../src/lib/courseSearchResults.js';

const brisbane = { category: 'place', type: 'town', name: 'Brisbane', display_name: 'Brisbane, Queensland, Australia', lat: -27.47, lon: 153.025, osm_id: 21 };

test('Photon bounds are converted and invalid extents are rejected', () => {
  assert.deepEqual(photonBounds([153.0, -27.5, 153.2, -27.3]), [-27.5, -27.3, 153.0, 153.2]);
  assert.equal(photonBounds(null), null);
  assert.equal(photonBounds([153.2, -27.3, 153.0, -27.5]), null);
  assert.equal(photonBounds([153.0, -27.5, 153.2]), null);
});

test('nearby OSM results attach map geometry while preserving course IDs', async () => {
  const cards = [{ id: 'gca-17', apiId: '17', name: 'Lakeview Golf Club', location: 'Brisbane', center: [-27.4700, 153.0250], sources: ['course-card'] }];
  const nearby = [{ id: 'osm-relation-44', name: 'Lakeview Golf Club', location: 'Nearby course', center: [-27.4705, 153.0252], osmType: 'relation', osmId: 44, sources: ['openstreetmap'] }];
  const result = await findGolfCourses('Lakeview', { searchDatabase: async () => cards, searchPlaces: async () => [brisbane], searchNearby: async () => nearby });
  const [course] = result.courses;
  assert.equal(course.id, 'gca-17');
  assert.equal(course.apiId, '17');
  assert.equal(course.osmId, 44);
  assert.deepEqual(course.sources, ['course-card', 'openstreetmap']);
  assert.equal(result.courses.at(-1).kind, 'place');
});

test('same-named courses in different locations stay separate', () => {
  const near = { id: 'osm-way-1', name: 'River Golf Club', center: [-27.47, 153.02], osmType: 'way', osmId: 1 };
  const far = { id: 'osm-way-2', name: 'River Golf Club', center: [-33.87, 151.21], osmType: 'way', osmId: 2 };
  assert.equal(mergeCourseSources([near, far]).length, 2);
});

test('name matching ignores punctuation and accents when courses are nearby', () => {
  const card = { id: 'gca-4', apiId: '4', name: 'Café de Golf', center: [48.8566, 2.3522] };
  const map = { id: 'osm-way-9', name: 'Cafe de Golf!', center: [48.8567, 2.3522], osmType: 'way', osmId: 9 };
  assert.equal(mergeCourseSources([card], [map]).length, 1);
});

test('a provider failure leaves mapped course results visible with a warning', async () => {
  const mapped = { category: 'leisure', type: 'golf_course', osm_type: 'way', osm_id: 70, name: 'Mapped Club', display_name: 'Mapped Club, Australia', lat: -27.47, lon: 153.025 };
  const result = await findGolfCourses('Mapped Club', { searchDatabase: async () => { throw new Error('offline'); }, searchPlaces: async () => [mapped], searchNearby: async () => [] });
  assert.equal(result.courses[0].name, 'Mapped Club');
  assert.match(result.warnings.join(' '), /Course-card search is unavailable/);
});

test('nearby timeout aborts its provider request and returns a partial result warning', async () => {
  let aborted = false;
  const result = await findGolfCourses('Brisbane', {
    searchDatabase: async () => [],
    searchPlaces: async () => [brisbane],
    searchNearby: (_lat, _lon, signal) => new Promise(() => signal.addEventListener('abort', () => { aborted = true; }, { once: true })),
    nearbyTimeoutMs: 5,
  });
  assert.equal(aborted, true);
  assert.match(result.warnings.join(' '), /Nearby course search timed out/);
  assert.equal(result.courses[0].kind, 'place');
});
