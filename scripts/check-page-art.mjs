import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const manifest = JSON.parse(await readFile('design-source/page-art/manifest.json', 'utf8'));
assert.equal(manifest.assets.length, 30);
const hashes = new Set();
for (const asset of manifest.assets) {
  const original = await readFile(`design-source/page-art/${asset.file}`);
  const hash = createHash('sha256').update(original).digest('hex');
  assert(!hashes.has(hash), `Repeated artwork: ${asset.id}`);
  hashes.add(hash);
  if (asset.kind === 'sprite') {
    const metadata = await sharp(`public/mascot/${asset.id}.webp`).metadata();
    assert.equal(metadata.width, 1152);
    assert.equal(metadata.height, 768);
    assert(metadata.hasAlpha, `Missing transparency: ${asset.id}`);
  } else {
    for (const width of [600, 1200]) {
      const metadata = await sharp(`public/page-art/${asset.id}-${width}.webp`).metadata();
      assert.equal(metadata.width, width);
      assert.equal(metadata.height, (width * 2) / 3);
    }
  }
}
console.log('✔ 28 distinct scenes, responsive artwork and 2 transparent panda atlases.');
