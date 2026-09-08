/**
 * Превръща суровите записи в това, което приложението сервира.
 *
 * Влиза:  design-source/audio/{animals,vehicles}/*.wav|mp3|ogg|m4a
 * Излиза: public/audio/{animals,vehicles}/*.ogg
 *
 * Защо изобщо: 1.5 s стерео WAV е ~265 KB. Двайсет такива са 5 MB — осем
 * пъти цялото приложение, което в момента е 660 KB. Същият звук като моно
 * ogg е около 20 KB.
 *
 * Какво прави с всеки файл:
 *   • прилага ръчното изрязване от `trim.json`, ако има такова
 *   • повтаря звука, ако е поискано („куак-куак“ вместо едно „куак“)
 *   • отрязва тишината в началото и в края
 *   • сваля до моно и 22 kHz — животински звук не печели нищо от повече
 *   • изравнява силата между всички файлове с таван −12 dBTP
 *   • ограничава до 2.5 s
 *
 *   npm run build:audio
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync, existsSync, mkdirSync, statSync, rmSync, readFileSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FOLDERS, isExpected } from './audio-manifest.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SOURCE = join(ROOT, 'design-source', 'audio');
const OUT = join(ROOT, 'src', 'assets', 'audio');


const TRIM_FILE = join(SOURCE, 'trim.json');
const ACCEPTED = ['.wav', '.mp3', '.ogg', '.m4a', '.flac', '.aiff', '.aif'];

/**
 * Намира ffmpeg: първо на PATH, после този, който Python носи наготово.
 * Вторият идва с `pip install imageio-ffmpeg` и не иска системна инсталация.
 */
function findFfmpeg() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return 'ffmpeg';
  } catch {
    // продължаваме към резервния вариант
  }

  for (const python of ['python', 'python3', 'py']) {
    try {
      const path = execFileSync(
        python,
        ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
      ).trim();
      if (path && existsSync(path)) return path;
    } catch {
      // пробваме следващия
    }
  }
  return null;
}

const ffmpeg = findFfmpeg();

if (!ffmpeg) {
  console.error('\n✖ Няма ffmpeg.\n');
  console.error('  Инсталирай го по един от двата начина:\n');
  console.error('    pip install imageio-ffmpeg      (не пипа системата)');
  console.error('    winget install Gyan.FFmpeg      (системно)\n');
  process.exit(1);
}

if (!existsSync(SOURCE)) {
  console.log(`\nℹ Няма папка design-source/audio.`);
  console.log('  Сложи суровите записи там и пусни командата пак.');
  console.log('  Списъкът и изискванията са в docs/AUDIO.md\n');
  process.exit(0);
}

/**
 * Ръчни точки на изрязване.
 *
 * Автоматичното рязане маха тишината, но не може да реши, че записът
 * съдържа ЧЕТИРИ крякания и трябва да остане само първото. Такива решения
 * се вземат с ухо и се записват тук като данни, не като код.
 */
function loadTrims() {
  if (!existsSync(TRIM_FILE)) return {};
  try {
    const raw = JSON.parse(readFileSync(TRIM_FILE, 'utf8'));
    const out = {};
    for (const [key, value] of Object.entries(raw)) {
      if (key.startsWith('_') || typeof value !== 'object' || value === null) continue;
      out[key] = value;
    }
    return out;
  } catch {
    console.error(`⚠ ${TRIM_FILE} не е валиден JSON — пренебрегвам го`);
    return {};
  }
}

const TRIMS = loadTrims();

/**
 * Веригата от филтри.
 *
 * `silenceremove` два пъти с обръщане между тях реже и двата края —
 * ffmpeg може да реже само от началото, затова записът се обръща, реже се
 * пак и се обръща обратно.
 *
 * `loudnorm` изравнява ВЪЗПРИЕМАНАТА сила между файловете, вместо просто да
 * ги усилва до тавана. Без него един запис ще е шепот, друг ще стряска.
 */
const SHAPE = [
  'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03',
  'areverse',
  'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03',
  'areverse',
  'loudnorm=I=-18:TP=-9:LRA=7',
].join(',');

/**
 * Таванът от docs/AUDIO.md: слушалки, детско ухо.
 *
 * Целим 1.5 dB ПОД него, защото Vorbis е кодек със загуби и възстановената
 * вълна прескача входния връх. Измерено: цел −12 даваше −10.7 на изхода.
 */
const PEAK_CEILING_DB = -12;

/** Таван на дължината. Детето слуша, после избира — дълъг звук губи вниманието. */
const MAX_SECONDS = 2.5;

/** Заглъхване в края, за да няма щракане при отсечените записи. */
const FADE_OUT_SECONDS = 0.12;
const CODEC_HEADROOM_DB = 1.5;

function run(args) {
  return execFileSync(ffmpeg, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/**
 * Реалният връх на вече обработения запис.
 *
 * Защо втори проход: `loudnorm` в еднократен режим НЕ спазва точно тавана
 * си — измерено, изкарва връх около −8 dB при поискани −9. Затова се мери
 * какво е излязло и се слага точната поправка. Иначе правилото „−12 dBFS“
 * щеше да е пожелание, а не факт.
 */
function measurePeakDb(file) {
  // `spawnSync`, а не `execFileSync`: volumedetect пише отчета на stderr и
  // ЗАВЪРШВА УСПЕШНО. Първата версия четеше stderr само при грешка, тоест
  // никога — и поправката тихо оставаше нула.
  const probe = spawnSync(ffmpeg, ['-i', file, '-af', 'volumedetect', '-f', 'null', '-'], {
    encoding: 'utf8',
  });
  const match = /max_volume:\s*(-?[\d.]+) dB/.exec(probe.stderr ?? '');
  return match?.[1] ? Number(match[1]) : null;
}

let converted = 0;
let skipped = 0;
const report = [];

for (const folder of FOLDERS) {
  const from = join(SOURCE, folder);
  if (!existsSync(from)) continue;

  const to = join(OUT, folder);
  mkdirSync(to, { recursive: true });

  for (const file of readdirSync(from)) {
    const ext = extname(file).toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      if (!file.startsWith('.') && file !== 'README.md') {
        report.push(`  ⚠ ${folder}/${file} — непознат формат, прескачам`);
        skipped++;
      }
      continue;
    }

    const name = basename(file, ext);

    // Файл, за който няма картинка, не се преобразува. Иначе се появява в
    // `public/` и проверката се оплаква при всяко пускане.
    if (!isExpected(folder, name)) {
      report.push(`  – ${folder}/${file} — няма картинка с това име, прескачам`);
      continue;
    }

    const target = join(to, `${name}.ogg`);
    const sourceSize = statSync(join(from, file)).size;

    const temp = join(to, `.${name}.tmp.wav`);
    const padded = join(to, `.${name}.pad.wav`);
    const looped = join(to, `.${name}.loop.wav`);

    const trim = TRIMS[`${folder}/${name}`];
    const start = trim?.start ?? 0;

    /**
     * ffmpeg приема `-t` И `-to`, но `-t` МЪЛЧАЛИВО печели. Първата версия
     * подаваше и двете и ръчното изрязване не правеше нищо — размерът на
     * файла излизаше същият. Затова се смята една продължителност.
     */
    const wanted = trim?.end !== undefined ? trim.end - start : MAX_SECONDS;
    const duration = Math.min(MAX_SECONDS, Math.max(0.1, wanted));

    const cut = start > 0 ? ['-ss', String(start)] : [];

    try {
      // Проход 1: изрязване и изравняване на силата.
      run([
        '-y', '-i', join(from, file), ...cut,
        '-af', SHAPE, '-t', String(duration), '-ac', '1', '-ar', '22050', temp,
      ]);

      /**
       * Проход 1а: повторение.
       *
       * Някои звуци се познават чак от втория път — патицата казва
       * „куак-куак“, не „куак“. Едно много късо крякане звучи като
       * прищракване; две подред са очевидни.
       *
       * Паузата се добавя ПРЕДИ повтарянето (`apad`), иначе двете копия се
       * слепват в един непрекъснат звук.
       */
      let shaped = temp;
      const repeat = Math.max(1, Math.min(4, Math.round(trim?.repeat ?? 1)));

      if (repeat > 1) {
        const gap = trim?.gap ?? 0.12;
        run(['-y', '-i', temp, '-af', `apad=pad_dur=${gap}`, padded]);
        run(['-y', '-stream_loop', String(repeat - 1), '-i', padded, looped]);
        rmSync(padded, { force: true });
        shaped = looped;
      }

      // Проход 2: точна поправка на върха и кодиране.
      const peak = measurePeakDb(shaped);
      const correction = peak === null ? 0 : PEAK_CEILING_DB - CODEC_HEADROOM_DB - peak;
      /**
       * Заглъхване в края.
       *
       * Дългите записи (автобус, трактор, самолет) се режат на тавана и без
       * това свършват с рязко отсичане, което щрака. `afade` може да
       * заглушава само от началото, затова записът се обръща, заглъхва се и
       * се обръща обратно — същият похват като при рязането на тишината.
       */
      const chain = [
        ...(correction === 0 ? [] : [`volume=${correction.toFixed(2)}dB`]),
        'areverse',
        `afade=t=in:st=0:d=${FADE_OUT_SECONDS}`,
        'areverse',
      ].join(',');

      // Таванът се налага и тук: повторението може да надхвърли изхода на
      // първия проход.
      run(['-y', '-i', shaped, '-af', chain, '-t', String(MAX_SECONDS),
           '-c:a', 'libvorbis', '-q:a', '3', target]);

      rmSync(temp, { force: true });
      rmSync(looped, { force: true });

      const outSize = statSync(target).size;
      report.push(
        `  ✔ ${folder}/${name}.ogg  ${(sourceSize / 1024).toFixed(0)} KB → ${(outSize / 1024).toFixed(1)} KB` +
          (trim?.end !== undefined || trim?.start !== undefined ? '  (изрязан)' : '') +
          (repeat > 1 ? `  (×${repeat})` : ''),
      );
      converted++;
    } catch {
      for (const scrap of [temp, padded, looped]) rmSync(scrap, { force: true });
      report.push(`  ✖ ${folder}/${file} — ffmpeg не успя да го прочете`);
      skipped++;
    }
  }
}

console.log(`\nffmpeg: ${ffmpeg === 'ffmpeg' ? 'системен' : 'от imageio-ffmpeg'}\n`);
for (const line of report) console.log(line);

if (converted === 0 && skipped === 0) {
  console.log('  Няма файлове за преобразуване.');
}
console.log(`\n✔ Преобразувани: ${converted}${skipped > 0 ? `, пропуснати: ${skipped}` : ''}\n`);
