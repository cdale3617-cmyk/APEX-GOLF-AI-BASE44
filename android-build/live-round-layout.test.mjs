import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/Rangefinder.jsx', import.meta.url), 'utf8');

test('portrait live-round layout matches the left-map/right-sidebar reference', () => {
  assert.ok(
    page.includes('grid-cols-[minmax(0,60fr)_minmax(0,40fr)] grid-rows-1'),
    'all widths must show a full-height 60% left map and 40% right sidebar',
  );

  const fixedControls = 44; // Search button; previous/next live on the map.
  const horizontalPadding = 2 * 6; // p-1.5 on the controls pane.
  const pickerMinimum = 60;
  for (const viewportWidth of [320, 360, 390, 412, 767]) {
    const usableWidth = viewportWidth * 0.4 - horizontalPadding - fixedControls;
    assert.ok(
      usableWidth >= pickerMinimum,
      `${viewportWidth}px viewport leaves only ${usableWidth}px for the course picker`,
    );
  }
});

test('hole navigation and distance summary stay outside the scrolling tools', () => {
  const navigation = page.indexOf('data-testid="round-hole-navigation"');
  const tools = page.indexOf('data-testid="round-tools-scroll"');
  const dock = page.indexOf('data-testid="round-distance-dock"');
  assert.ok(navigation >= 0 && navigation < tools && tools < dock);
  const dockSource = page.slice(dock, page.indexOf('<EnvModal', dock));
  assert.ok(!dockSource.includes('overflow-y-auto'));
  assert.ok(dockSource.includes('expanded={false}'));
  assert.ok(page.includes('flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto'));
});

test('previous and next hole actions have explicit labels and 44-pixel targets', () => {
  const bar = readFileSync(new URL('../src/components/rangefinder/HoleBar.jsx', import.meta.url), 'utf8');
  assert.ok(bar.includes('aria-label="Previous hole"'));
  assert.ok(bar.includes('aria-label="Next hole"'));
  assert.ok(bar.includes('>Prev</span>') && bar.includes('>Next</span>'));
  assert.ok(bar.includes('h-11 w-12'));
});

test('sidebar uses vertical green/view controls while optional tools stay collapsed', () => {
  assert.ok(page.includes('data-testid="round-secondary-tools" open={!course}'));
  assert.ok(page.includes('<GreenDistances graphics={graphics} sidebar />'));
  assert.ok(page.includes('<ViewControls pitchOn'));
  assert.ok(page.includes('<HoleBar compact'));
  assert.ok(!page.includes('max-h-[42vh] overflow-y-auto'));
});
