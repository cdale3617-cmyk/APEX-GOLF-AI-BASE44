import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveCourseSearch } from '../src/lib/courseSearchResolver.js';

const town = { display_name: 'Yeppoon, Queensland', lat: -23.13, lon: 150.74 };
const club = { id: 'osm-way-5', name: 'Yeppoon Golf Club', center: [-23.13, 150.74] };
const golfRow = {
  osm_type: 'way',
  osm_id: 5,
  category: 'leisure',
  type: 'golf_course',
  display_name: 'Yeppoon Golf Club, Queensland',
  name: 'Yeppoon Golf Club',
  lat: -23.13,
  lon: 150.74,
};

function sources(overrides = {}) {
  return {
    searchPlaces: async () => [],
    searchGolf: async () => [],
    searchDatabase: async () => [],
    findTown: async () => null,
    searchNearby: async () => [],
    distanceYards: () => 0,
    toCourse: () => club,
    ...overrides,
  };
}

test('a place lookup returns nearby real clubs, not just a town marker', async () => {
  const results = await resolveCourseSearch('Yeppoon', sources({
    searchPlaces: async () => [town],
    searchNearby: async () => [club],
  }));
  assert.equal(results[0].kind, 'place');
  assert.equal(results[1].name, 'Yeppoon Golf Club');
});

test('a direct club match is selectable without a town lookup', async () => {
  const results = await resolveCourseSearch('Yeppoon Golf Club', sources({
    searchPlaces: async () => [golfRow],
    findTown: async () => { throw new Error('Should not use fallback'); },
  }));
  assert.deepEqual(results, [club]);
});

test('a town geocoder recovers when both Photon searches fail', async () => {
  const unavailable = async () => { throw new Error('Photon network failure'); };
  const results = await resolveCourseSearch('Yeppoon Golf Club', sources({
    searchPlaces: unavailable,
    searchGolf: unavailable,
    searchDatabase: unavailable,
    findTown: async () => town,
    searchNearby: async () => [club],
  }));
  assert.equal(results[0].kind, 'place');
  assert.equal(results[1].name, 'Yeppoon Golf Club');
});

test('a complete lookup outage reports a real error instead of empty results', async () => {
  const unavailable = async () => { throw new Error('network unavailable'); };
  await assert.rejects(
    resolveCourseSearch('Capricorn Resort', sources({
      searchPlaces: unavailable,
      searchGolf: unavailable,
      searchDatabase: unavailable,
      findTown: unavailable,
    })),
    /not responding/,
  );
});

test('an available town remains visible when the nearby map mirror fails', async () => {
  const results = await resolveCourseSearch('Yeppoon', sources({
    searchPlaces: async () => [town],
    searchNearby: async () => { throw new Error('Overpass busy'); },
  }));
  assert.equal(results.length, 1);
  assert.equal(results[0].kind, 'place');
});

test('an empty query never calls a provider', async () => {
  const results = await resolveCourseSearch('  ', sources({
    searchPlaces: async () => { throw new Error('Should not fetch'); },
  }));
  assert.deepEqual(results, []);
});


test('Android hole map uses key-free map tiles and retains satellite imagery', () => {
  const component = readFileSync(new URL('../src/components/rangefinder/MapLibreHoleMap.jsx', import.meta.url), 'utf8');
  assert.equal(component.includes('basemaps.cartocdn.com'), false);
  assert.ok(component.includes('tile.openstreetmap.org'));
  assert.ok(component.includes('server.arcgisonline.com'));
});

test('an exact golf club name is not duplicated in the map lookup', async () => {
  let queryUsed = '';
  await resolveCourseSearch('Yeppoon Golf Club', sources({
    searchGolf: async (query) => { queryUsed = query; return []; },
  }));
  assert.equal(queryUsed, 'Yeppoon Golf Club');
});

test('short club-name lookup finds a town when normal providers fail', async () => {
  const unavailable = async () => { throw new Error('Provider unavailable'); };
  const results = await resolveCourseSearch('Yeppoon Golf Club', sources({
    searchPlaces: unavailable,
    searchGolf: unavailable,
    searchDatabase: unavailable,
    findTownByCourseName: async () => town,
    findTown: unavailable,
    searchNearby: async () => [club],
  }));
  assert.equal(results[0].kind, 'place');
  assert.equal(results[1].name, 'Yeppoon Golf Club');
});

test('Android search reports errors visibly and avoids a default Florida map', () => {
  const component = readFileSync(new URL('../src/pages/Rangefinder.jsx', import.meta.url), 'utf8');
  assert.ok(component.includes('onClick={runSearch}'));
  assert.ok(component.includes('role="status" aria-live="polite"'));
  assert.ok(component.includes('Search for a course above, or allow GPS'));
});

test('phone-sized course results appear under the single search box, not inside the tools scroll panel', () => {
  const component = readFileSync(new URL('../src/pages/Rangefinder.jsx', import.meta.url), 'utf8');
  const mapStart = component.indexOf('<div className="relative h-full min-h-0 min-w-0 overflow-hidden">');
  assert.ok(mapStart > 0);
  const searchHeader = component.slice(0, mapStart);
  const toolsPanel = component.slice(mapStart);
  assert.ok(searchHeader.includes('aria-label="Course search results"'));
  assert.ok(searchHeader.includes('onClick={() => loadCourse(result)}'));
  assert.ok(searchHeader.includes('onClick={() => toggleSavedCourse(result)}'));
  assert.equal(toolsPanel.includes('onClick={() => loadCourse(result)}'), false);
  assert.equal((component.match(/role="search"/g) || []).length, 1);
});
