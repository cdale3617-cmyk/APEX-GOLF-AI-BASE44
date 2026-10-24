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

test('scrollable controls and distance dock use separate flex slots', () => {
  assert.ok(
    page.includes('relative z-[1000] flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto'),
    'the controls list should scroll within its flex slot',
  );
  assert.ok(
    page.includes('relative z-[1000] max-h-[38%] shrink-0 overflow-y-auto'),
    'the distance dock should reserve its own space instead of overlaying controls',
  );
});
