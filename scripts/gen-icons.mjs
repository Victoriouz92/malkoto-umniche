/**
 * Генератор на иконите за PWA — T0.2 от PLAN.md.
 *
 * Нула зависимости: рисува в паметта и кодира PNG директно (zlib е в Node).
 * Причината не е пуризъм — иконите са част от build-а и не бива да зависят
 * от нативен пакет, който да се чупи при следваща инсталация.
 *
 * Знакът е временен, като цялата графика в проекта. Замяната му е един
 * файл — виж docs/ASSETS.md.
 *
 *   node scripts/gen-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../public/icons/', import.meta.url));

// ── Палитра (огледало на tokens.css) ─────────────────────────────
const BG = [0xfd, 0xfb, 0xf7];
const CORE = [0xe8, 0x5f, 0x35];
const PETALS = [
  [0xf0, 0x8a, 0x4b], // горе  — пъзели
  [0x4f, 0xb0, 0x7c], // дясно — числа
  [0x8b, 0x7b, 0xd8], // долу  — памет
  [0x5a, 0x9b, 0xd8], // ляво  — букви
];

// ── Мъничък растеризатор ─────────────────────────────────────────
// 3x supersampling: достатъчно за гладък ръб при тези размери.
const SS = 3;

function createCanvas(size) {
  const w = size * SS;
  return { w, size, px: new Float64Array(w * w * 3), a: new Float64Array(w * w) };
}

function fill(c, rgb) {
  for (let i = 0; i < c.a.length; i++) {
    c.px[i * 3] = rgb[0];
    c.px[i * 3 + 1] = rgb[1];
    c.px[i * 3 + 2] = rgb[2];
    c.a[i] = 1;
  }
}

function blend(c, i, rgb) {
  c.px[i * 3] = rgb[0];
  c.px[i * 3 + 1] = rgb[1];
  c.px[i * 3 + 2] = rgb[2];
  c.a[i] = 1;
}

function circle(c, cx, cy, r, rgb) {
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(c.w - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(c.w - 1, Math.ceil(cy + r));
  const r2 = r * r;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) blend(c, y * c.w + x, rgb);
    }
  }
}

/** Заоблен правоъгълник; всичко извън него става прозрачно. */
function roundedMask(c, radius) {
  const w = c.w;
  const r = radius * SS;
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      const qx = Math.min(x + 0.5, w - x - 0.5);
      const qy = Math.min(y + 0.5, w - y - 0.5);
      if (qx < r && qy < r) {
        const dx = r - qx;
        const dy = r - qy;
        if (dx * dx + dy * dy > r * r) c.a[y * w + x] = 0;
      }
    }
  }
}

/** Смъква supersample-а до RGBA буфер с права алфа. */
function resolve(c) {
  const n = c.size;
  const out = Buffer.alloc(n * n * 4);
  const area = SS * SS;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = (y * SS + sy) * c.w + (x * SS + sx);
          const av = c.a[i];
          r += c.px[i * 3] * av;
          g += c.px[i * 3 + 1] * av;
          b += c.px[i * 3 + 2] * av;
          a += av;
        }
      }
      const o = (y * n + x) * 4;
      out[o] = a > 0 ? Math.round(r / a) : 0;
      out[o + 1] = a > 0 ? Math.round(g / a) : 0;
      out[o + 2] = a > 0 ? Math.round(b / a) : 0;
      out[o + 3] = Math.round((a / area) * 255);
    }
  }
  return out;
}

// ── PNG кодер ────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // битова дълбочина
  ihdr[9] = 6; // RGBA
  // 10..12 = compression/filter/interlace, всички 0

  // Филтър 0 (None) пред всеки ред — при плоски цветове zlib се справя сам.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Знакът ───────────────────────────────────────────────────────
/**
 * @param {number} size
 * @param {'rounded'|'maskable'|'square'} mode
 *   rounded  — прозрачни заоблени ъгли (Android/десктоп)
 *   maskable — плътен квадрат, знакът свит в безопасната зона (Android изрязва до кръг)
 *   square   — плътен квадрат, знакът в нормален размер (iOS; прозрачността
 *              там става ЧЕРНА, затова ъглите не се изрязват)
 */
function drawIcon(size, mode) {
  const c = createCanvas(size);
  fill(c, BG);

  const mid = c.w / 2;
  const scale = mode === 'maskable' ? 0.62 : 0.9;
  const coreR = 0.165 * c.w * scale;
  const petalR = 0.115 * c.w * scale;
  const orbit = 0.275 * c.w * scale;

  const offsets = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  offsets.forEach(([dx, dy], i) => {
    circle(c, mid + dx * orbit, mid + dy * orbit, petalR, PETALS[i]);
  });

  circle(c, mid, mid, coreR, CORE);

  if (mode === 'rounded') roundedMask(c, size * 0.22);

  return encodePng(resolve(c), size);
}

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Малкото Умниче">
  <rect width="512" height="512" rx="113" fill="#FDFBF7"/>
  <circle cx="256" cy="129" r="53" fill="#F08A4B"/>
  <circle cx="383" cy="256" r="53" fill="#4FB07C"/>
  <circle cx="256" cy="383" r="53" fill="#8B7BD8"/>
  <circle cx="129" cy="256" r="53" fill="#5A9BD8"/>
  <circle cx="256" cy="256" r="76" fill="#E85F35"/>
</svg>
`;

mkdirSync(OUT, { recursive: true });

const targets = [
  ['icon-192.png', 192, 'rounded'],
  ['icon-512.png', 512, 'rounded'],
  ['icon-maskable-512.png', 512, 'maskable'],
  ['apple-touch-icon.png', 180, 'square'],
];

for (const [name, size, mode] of targets) {
  writeFileSync(join(OUT, name), drawIcon(size, mode));
  console.log(`  ✔ icons/${name}  (${size}×${size}, ${mode})`);
}

writeFileSync(join(OUT, 'icon.svg'), SVG, 'utf8');
console.log('  ✔ icons/icon.svg');
console.log('Готово.');
