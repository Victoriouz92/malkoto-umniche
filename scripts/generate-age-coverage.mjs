import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const activitiesDir = join(root, 'src', 'content', 'activities');
const generatedI18n = join(root, 'src', 'i18n', 'generatedActivities.ts');

const pools = {
  animals: ['animal.bear', 'animal.dog', 'animal.cat', 'animal.duck', 'animal.frog', 'animal.rabbit', 'animal.fox', 'animal.owl', 'animal.cow', 'animal.pig'],
  food: ['food.apple', 'food.banana', 'food.pear', 'food.strawberry', 'food.grapes', 'food.carrot', 'food.bread', 'food.tomato'],
  vehicles: ['vehicle.car', 'vehicle.bus', 'vehicle.train', 'vehicle.tractor', 'vehicle.truck', 'vehicle.airplane'],
  mixed: ['animal.cat', 'food.apple', 'vehicle.car', 'nature.flower', 'animal.fish', 'food.banana', 'vehicle.bus', 'nature.mushroom'],
  memory: ['animal.fox', 'animal.owl', 'animal.rabbit', 'food.apple', 'food.pear', 'vehicle.car', 'vehicle.train', 'nature.flower', 'nature.mushroom', 'animal.fish'],
  letters: ['letter.a', 'letter.b', 'letter.v', 'letter.g', 'letter.d', 'letter.e', 'letter.k', 'letter.m', 'letter.o', 'letter.s'],
  numbers: ['number.1', 'number.2', 'number.3', 'number.4', 'number.5'],
  shapes: ['shape.circle', 'shape.square', 'shape.triangle', 'shape.star', 'shape.heart'],
};

const plans = [
  { category: 'numbers', prefix: 'early-numbers', count: 5, pool: pools.numbers, theme: 'shapes', skill: 'number-sense', title: 'Преброй' },
  { category: 'letters', prefix: 'early-letters', count: 10, pool: pools.letters, theme: 'shapes', skill: 'letter-recognition', title: 'Букви на място' },
];

const translations = {};
const pick = (pool, start, length) => Array.from({ length }, (_, index) => pool[(start + index) % pool.length]);
const letterGlyphs = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'К', 'М', 'О', 'С'];
const letterDistractors = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'К', 'М', 'О', 'С', 'Т'];

for (const plan of plans) {
  for (let index = 0; index < plan.count; index += 1) {
    const n = index + 1;
    const id = `${plan.prefix}-${String(n).padStart(2, '0')}`;

    // Буквите не са фигури за наместване в дупка. Всяка ранна игра
    // има ясна езикова цел: откриване на една конкретна буква сред близки форми.
    if (plan.category === 'letters') {
      const target = letterGlyphs[index];
      const others = pick(letterDistractors.filter((letter) => letter !== target), index, 3);
      const grid = [target, others[0], target, others[1], others[2], target];
      const activity = {
        id,
        schemaVersion: 1,
        engine: 'letters',
        mechanic: 'm049',
        titleKey: `act.${id}`,
        category: 'letters',
        ageMin: 2,
        ageMax: 6,
        difficulty: index < 5 ? 1 : 2,
        skills: ['letter-recognition', 'visual-discrimination', 'sustained-attention'],
        themes: ['shapes'],
        durationSec: 60,
        assets: [],
        params: { mode: 'find', target, grid },
        parentNoteKey: `note.${id}`,
        a11y: { colorIndependent: true, requiresAudio: false, requiresPrecision: false },
        noFail: true,
      };
      writeFileSync(join(activitiesDir, `${id}.json`), `${JSON.stringify(activity, null, 2)}\n`);
      translations[`act.${id}`] = `Намери буквата ${target}`;
      translations[`note.${id}`] = `Детето търси всички букви ${target} сред няколко ясни възможности.`;
      continue;
    }

    // Цифрата има смисъл, когато отговаря на количество, а не когато се намества
    // в черен силует. Ранните задачи затова свързват 1–5 предмета с правилната цифра.
    if (plan.category === 'numbers') {
      const count = (index % 5) + 1;
      const objectPool = ['food.apple', 'animal.duck', 'vehicle.car', 'nature.flower', 'food.strawberry'];
      const asset = objectPool[index % objectPool.length];
      const activity = {
        id,
        schemaVersion: 1,
        engine: 'counting',
        mechanic: 'm039',
        titleKey: `act.${id}`,
        category: 'numbers',
        ageMin: 2,
        ageMax: 6,
        difficulty: count <= 3 ? 1 : 2,
        skills: ['counting', 'number-sense', 'visual-discrimination'],
        themes: ['garden'],
        durationSec: 60,
        assets: [asset],
        params: { rounds: [{ asset, count }], choices: count <= 3 ? 2 : 3 },
        parentNoteKey: `note.${id}`,
        a11y: { colorIndependent: true, requiresAudio: false, requiresPrecision: false },
        noFail: true,
      };
      writeFileSync(join(activitiesDir, `${id}.json`), `${JSON.stringify(activity, null, 2)}\n`);
      translations[`act.${id}`] = `Преброй до ${count}`;
      translations[`note.${id}`] = `Детето преброява ${count} познати предмета и свързва количеството с цифра.`;
      continue;
    }

    const items = pick(plan.pool, index, index % 3 === 2 ? 3 : 2);
    const mode = plan.soundPool && index % 3 === 1 ? 'sound' : index % 3 === 2 ? 'sequence' : 'puzzle';
    const sequenceAsset = items[0];
    const sound = plan.soundPool?.[index % plan.soundPool.length];
    const soundChoices = sound && plan.soundPool ? pick(plan.soundPool, index, 3) : [];
    if (sound && !soundChoices.includes(sound)) soundChoices[0] = sound;
    const params = mode === 'sequence'
      ? {
          items: [0.45, 0.68, 0.92].map((scale) => ({ kind: 'asset', id: sequenceAsset, scale })),
          kind: index % 2 === 0 ? 'size-asc' : 'size-desc',
        }
      : mode === 'sound'
        ? { rounds: [{ sound, choices: soundChoices }], autoPlay: true }
        : { pieces: items };
    const activity = {
      id,
      schemaVersion: 1,
      engine: mode === 'sequence' ? 'sequencing' : mode === 'sound' ? 'sound-match' : 'puzzle',
      mechanic: mode === 'sequence' ? 'm101' : mode === 'sound' ? 'm085' : 'm031',
      titleKey: `act.${id}`,
      category: plan.category,
      ageMin: 2,
      ageMax: 6,
      difficulty: index < 4 ? 1 : 2,
      skills: [plan.skill, mode === 'sound' ? 'listening' : mode === 'sequence' ? 'sequencing' : 'fine-motor'],
      themes: [plan.theme],
      durationSec: 45 + (index % 3) * 15,
      assets: mode === 'sound' ? soundChoices : mode === 'sequence' ? [sequenceAsset] : items,
      params,
      parentNoteKey: `note.${id}`,
      a11y: { colorIndependent: true, requiresAudio: false, requiresPrecision: false },
      noFail: true,
    };
    writeFileSync(join(activitiesDir, `${id}.json`), `${JSON.stringify(activity, null, 2)}\n`);
    translations[`act.${id}`] = `${plan.title}: ${mode === 'sound' ? 'познай звука' : mode === 'sequence' ? 'подреди по размер' : `пъзел ${n}`}`;
    translations[`note.${id}`] = mode === 'sound'
      ? 'Разпознаването по звук добавя слухова задача и свързва чутото с позната картина.'
      : mode === 'sequence'
        ? 'Подреждането на еднакъв предмет по размер развива сравнението и последователното мислене.'
        : 'Поставянето на ясни, познати форми в техните места развива координацията и зрителното сравнение.';
  }
}

const colorPlans = [
  ['early-colors-warm', 'lineart.flower', ['red', 'orange', 'yellow', 'pink'], 'Топлите цветове'],
  ['early-colors-cool', 'lineart.fish', ['green', 'teal', 'blue', 'purple'], 'Морските цветове'],
  ['early-colors-rainbow', 'lineart.bus', ['red', 'orange', 'yellow', 'green', 'blue', 'purple'], 'Автобус дъга'],
];
for (const [id, lineart, palette, title] of colorPlans) {
  const activity = {
    id, schemaVersion: 1, engine: 'coloring', mechanic: 'm078', titleKey: `act.${id}`, category: 'colors',
    ageMin: 2, ageMax: 6, difficulty: 1, skills: ['creativity', 'fine-motor'], themes: ['shapes'], durationSec: 120,
    assets: [lineart], params: { lineart, palette }, parentNoteKey: `note.${id}`,
    a11y: { colorIndependent: true, requiresAudio: false, requiresPrecision: false }, noFail: true,
  };
  writeFileSync(join(activitiesDir, `${id}.json`), `${JSON.stringify(activity, null, 2)}\n`);
  translations[`act.${id}`] = title;
  translations[`note.${id}`] = 'Свободното оцветяване развива фината моторика, творческия избор и увереността без верен или грешен цвят.';
}

const rows = Object.entries(translations).map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`).join('\n');
writeFileSync(generatedI18n, `/** Генерирано от scripts/generate-age-coverage.mjs. */\nexport const generatedActivityBg = {\n${rows}\n} as const;\n`);

const svgDir = join(root, 'src', 'assets', 'svg');
const shapeDir = join(svgDir, 'shape');
mkdirSync(shapeDir, { recursive: true });
const shapes = {
  circle: '<circle cx="50" cy="50" r="32" fill="#62c7bd"/>',
  square: '<rect x="20" y="20" width="60" height="60" rx="8" fill="#f2b84b"/>',
  triangle: '<path d="M50 16 86 82H14Z" fill="#e96a5f"/>',
  star: '<path d="m50 12 11 24 27 3-20 18 6 27-24-14-24 14 6-27-20-18 27-3Z" fill="#f4c542"/>',
  heart: '<path d="M50 84 17 53C-2 33 25 8 50 31 75 8 102 33 83 53Z" fill="#e86e91"/>',
};
for (const [name, body] of Object.entries(shapes)) {
  writeFileSync(join(shapeDir, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><g transform="scale(2.56)">${body}</g></svg>\n`);
}

console.log(`Generated ${Object.keys(translations).length / 2} activities and ${Object.keys(translations).length} translations.`);
