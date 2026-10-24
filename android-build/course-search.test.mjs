import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeCourseSources } from '../src/lib/courseSearchResults.js';

test('same nearby course combines card data with OSM geometry and preserves its saved id', () => {
  const cards = [{ id: 'gca-17', apiId: '17', name: 'Lakeview Golf Club', location: 'Brisbane', center: [-27.4700, 153.0250], sources: ['course-card'] }];
  const mapped = [{ id: 'osm-relation-44', name: 'Lakeview Golf Club', location: 'Nearby course', center: [-27.4705, 153.0252], osmType: 'relation', osmId: 44, sources: ['openstreetmap'] }];
  const [course] = mergeCourseSources(cards, mapped);
  assert.equal(course.id, 'gca-17');
  assert.equal(course.apiId, '17');
  assert.equal(course.osmType, 'relation');
  assert.equal(course.osmId, 44);
  assert.equal(course.location, 'Brisbane');
  assert.deepEqual(course.sources, ['course-card', 'openstreetmap']);
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
