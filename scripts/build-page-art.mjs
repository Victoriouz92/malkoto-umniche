import sharp from 'sharp';
import { readFile, mkdir } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('design-source/page-art/manifest.json', 'utf8'));
await mkdir('public/page-art', { recursive: true });
await mkdir('public/mascot', { recursive: true });
for (const asset of manifest.assets) {
  const input = `design-source/page-art/${asset.file}`;
  if (asset.kind === 'sprite') {
    await sharp(input)
      .resize(1152, 768)
      .webp({ quality: 85, alphaQuality: 100, effort: 6 })
      .toFile(`public/mascot/${asset.id}.webp`);
  } else {
    for (const width of [600, 1200]) {
      await sharp(input)
        .resize({ width })
        .webp({ quality: 79, effort: 6 })
        .toFile(`public/page-art/${asset.id}-${width}.webp`);
    }
  }
}
console.log(`Built ${manifest.assets.length} original illustrations and sprite atlases.`);
