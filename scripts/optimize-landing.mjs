import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

// Keep original artwork; generate compact runtime images reproducibly.
await mkdir('public/optimized', { recursive: true });
for (const name of ['hero-malkoto-umniche', 'slide-numbers-wide', 'slide-reading-wide', 'slide-letters-wide']) {
  for (const width of [800, 1600]) {
    const result = await sharp(`public/${name}.png`).resize({ width, withoutEnlargement: true })
      .webp({ quality: 86, effort: 6 }).toFile(`public/optimized/${name}-${width}.webp`);
    console.log(`${name}-${width}: ${result.size} bytes`);
  }
}
