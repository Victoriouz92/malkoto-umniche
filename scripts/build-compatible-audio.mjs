/** Keep the original Ogg files; ship MP3 as a widely supported playback format. */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../src/assets/audio/', import.meta.url));
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
let count = 0;
for (const folder of ['animals', 'vehicles']) {
  for (const file of readdirSync(join(root, folder)).filter((name) => name.endsWith('.ogg'))) {
    const target = join(root, folder, file.replace(/\.ogg$/, '.mp3'));
    if (existsSync(target) && !process.argv.includes('--force')) continue;
    execFileSync(ffmpeg, ['-y', '-v', 'error', '-i', join(root, folder, file),
      '-map_metadata', '-1', '-ac', '1', '-ar', '22050', '-c:a', 'libmp3lame', '-b:a', '64k', target]);
    count++;
  }
}
console.log(`Compatible audio: ${count} MP3 files generated.`);
