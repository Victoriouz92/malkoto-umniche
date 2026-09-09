import assert from 'node:assert/strict';
import { findRegions } from '../src/engines/coloring/regions';

const width = 15;
const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
// Closed rectangle with a divider: two independent areas and exterior paper.
for (let y = 2; y <= 12; y++)
  for (let x = 2; x <= 12; x++) {
    if (x === 2 || x === 7 || x === 12 || y === 2 || y === 12) {
      const p = (y * width + x) * 4;
      pixels[p] = pixels[p + 1] = pixels[p + 2] = 30;
    }
  }
const original = pixels.slice();
const { labels, regions } = findRegions(pixels, width, width);
assert.equal(regions.length, 2);
assert.notEqual(labels[5 * width + 4], labels[5 * width + 9]);
assert.equal(labels[0], -1, 'Exterior paper cannot be painted');
assert.equal(labels[5 * width + 7], 0, 'Outlines cannot be painted');
assert.equal(regions[0]!.length, 36);
assert.equal(regions[1]!.length, 36);
assert.equal(new Set(regions.flat()).size, 72, 'No pixel belongs to two areas');
assert.deepEqual(pixels, original, 'Region detection does not repaint source');
console.log('✔ Coloring: isolated areas, protected outlines, exterior exclusion.');
