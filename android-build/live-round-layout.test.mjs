import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/Rangefinder.jsx', import.meta.url), 'utf8');

test('portrait live-round layout gives the course picker a usable full-width row', () => {
  assert.ok(
    page.includes('grid-cols-1 grid-rows-[minmax(0,52fr)_minmax(0,48fr)] md:grid-cols-[minmax(0,60%)_minmax(0,40%)] md:grid-rows-1'),
    'phones should stack map and tools; the 60/40 split belongs at md and wider',
  );

  const fixedControls = 3 * 40 + 3 * 6; // Search, layers, hide buttons and row gaps.
  const horizontalPadding = 2 * 6; // p-1.5 on the controls pane.
  const pickerMinimum = 80; // Previous/next buttons plus a visible course selector.
  for (const viewportWidth of [320, 360, 390, 412, 767]) {
    const usableWidth = viewportWidth - horizontalPadding - fixedControls;
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

test('large optional tools are collapsed and green/view controls use compact variants', () => {
  assert.ok(page.includes('data-testid="round-secondary-tools" open={!course}'));
  assert.ok(page.includes('<GreenDistances graphics={graphics} compact />'));
  assert.ok(page.includes('<ViewControls compact'));
  assert.ok(!page.includes('max-h-[42vh] overflow-y-auto'));
});
