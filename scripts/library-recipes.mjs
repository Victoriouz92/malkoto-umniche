import { bg } from '../src/i18n/bg';
import { routeSolution } from '../src/engines/route-program/schema';

const ids = (group, names) => names.split(' ').map((name) => group + '.' + name);
const farm = ids('animal', 'cow pig horse sheep goat duck chicken');
const forest = ids('animal', 'bear fox owl rabbit squirrel hedgehog frog');
const sea = ids('animal', 'fish whale crab octopus');
const pets = ids('animal', 'cat dog');
const fruit = ids('food', 'apple banana grapes pear strawberry');
const food = [...fruit, 'food.carrot', 'food.tomato', 'food.bread'];
const vehicles = ids('vehicle', 'bus car truck train tractor airplane');
const nature = ids('nature', 'cloud flower leaf mushroom sun tree');
const shapes = ['circle', 'triangle', 'square', 'star', 'heart', 'rectangle', 'oval', 'diamond'];
const colors = ['red', 'yellow', 'blue', 'green', 'purple', 'orange', 'teal', 'pink', 'brown', 'grey'];
const all = [...farm, ...forest, ...sea, ...pets, ...food, ...vehicles, ...nature];
const sounds = [...farm, ...pets, ...ids('animal', 'bear fox owl frog whale')];
const alphabet = [...'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЬЮЯ'];
const assetToken = (id, scale = 1) => ({ kind: 'asset', id, scale });
const shapeToken = (shape, color, scale = 1) => ({ kind: 'shape', shape, color, scale });
const name = (id) => bg['asset.' + id] ?? id;
const upper = (value) => value[0].toUpperCase() + value.slice(1);

// Each recipe has a deterministic random stream. Regenerating a pack gives
// the same puzzles, and the variety comes from their rules and actual inputs.
function sampler(seed) {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const int = (n) => Math.floor(random() * n);
  const pick = (pool) => pool[int(pool.length)];
  const sample = (pool, count) => {
    const rest = [...new Set(pool)];
    return Array.from({ length: Math.min(count, rest.length) }, () => rest.splice(int(rest.length), 1)[0]);
  };
  return { int, pick, sample };
}

const parts = [
  ['animal.bear', 'МЕЧ КА'], ['animal.cat', 'КОТ КА'], ['animal.dog', 'КУ ЧЕ'],
  ['animal.cow', 'КРА ВА'], ['animal.duck', 'ПА ТИ ЦА'], ['animal.frog', 'ЖА БА'],
  ['animal.fox', 'ЛИ СИ ЦА'], ['animal.goat', 'КО ЗА'], ['animal.pig', 'ПРА СЕ'],
  ['animal.rabbit', 'ЗА ЕК'], ['animal.squirrel', 'КА ТЕ РИ ЦА'], ['animal.hedgehog', 'ТА РА ЛЕЖ'],
  ['animal.octopus', 'ОК ТО ПОД'], ['food.apple', 'Я БЪЛ КА'], ['food.pear', 'КРУ ША'],
  ['food.carrot', 'МОР КОВ'], ['food.strawberry', 'Я ГО ДА'], ['food.tomato', 'ДО МАТ'],
  ['vehicle.airplane', 'СА МО ЛЕТ'], ['vehicle.car', 'КО ЛА'], ['vehicle.truck', 'КА МИ ОН'],
  ['vehicle.tractor', 'ТРАК ТОР'], ['nature.tree', 'ДЪР ВО'], ['nature.flower', 'ЦВЕ ТЕ'],
];

const drawingIdeas = [
  ['nature.cloud', 'Облак с дъжд', 'Сложи точки под облака. Те могат да станат капки.'],
  ['nature.sun', 'Лъчи на слънцето', 'Нарисувай кръг. Добави лъчи около него.'],
  ['animal.fish', 'Мехурчета за рибката', 'Нарисувай рибка и кръгчета над нея.'],
  ['animal.frog', 'Езерце за жабата', 'Направи езерце и няколко листа по водата.'],
  ['nature.tree', 'Дърво в четири сезона', 'Избери сезон. Какво ще има по клоните?'],
  ['animal.fox', 'Стъпки в снега', 'Направи пътека от следи. Къде отива лисицата?'],
  ['nature.flower', 'Градина от спирали', 'Нарисувай цветя със спирали в средата.'],
  ['vehicle.train', 'Влак по две линии', 'Нарисувай две релси и вагони по тях.'],
  ['food.strawberry', 'Ягода на точки', 'Направи голяма ягода и добави семенца.'],
  ['animal.octopus', 'Танц под водата', 'Нарисувай октопод с извити пипала.'],
  ['nature.mushroom', 'Гъби с различни шапки', 'Нарисувай две гъби. Направи шапките им различни.'],
  ['animal.owl', 'Сова под звездите', 'Измисли как изглежда небето, когато бухалът е буден.'],
  ['vehicle.airplane', 'Две следи в небето', 'Нарисувай два самолета. Нека оставят различни следи.'],
  ['food.apple', 'Дърво с шарени ябълки', 'Сложи ябълки по клоните и една под дървото.'],
  ['animal.crab', 'Рак на плажа', 'Нарисувай рака между пясъка и морето. Какво има край него?'],
  ['animal.sheep', 'Овца от къдрици', 'Сложи една до друга извити линии за вълната.'],
  ['vehicle.bus', 'Автобус с пътници', 'Кой седи на всеки прозорец? Нарисувай лицата им.'],
  ['nature.leaf', 'Огледални листа', 'Направи две листа от двете страни на една линия.'],
  ['animal.whale', 'Фонтанът на кита', 'Нарисувай извити линии над кита.'],
  ['food.grapes', 'Грозде от кръгчета', 'Нарисувай големи и малки зрънца. Събери ги в чепка.'],
  ['animal.hedgehog', 'Таралеж с бодли', 'Добави къси чертички по гърба му.'],
  ['animal.rabbit', 'Скокове по поляната', 'Нарисувай дъги, които показват как скача заекът.'],
  ['vehicle.tractor', 'Следи от трактор', 'Нарисувай трактор и две следи след него.'],
  ['animal.duck', 'Патици в редица', 'Нарисувай голяма патица и малки патици след нея.'],
];

const paint = [
  ['apple', 'Ябълка наесен'], ['bear', 'Мечка в сумрака'], ['bus', 'Автобус на празника'],
  ['car', 'Кола за морето'], ['cat', 'Котка в полунощ'], ['duck', 'Патица на слънце'],
  ['fish', 'Рибка край коралите'], ['flower', 'Цвете след дъжда'], ['frog', 'Жаба на гости'],
  ['strawberry', 'Ягода от приказките'],
];

const palettes = [
  ['yellow', 'blue', 'red'], ['orange', 'purple', 'pink'], ['teal', 'blue', 'green'],
  ['yellow', 'orange', 'brown', 'red'], ['purple', 'grey', 'blue', 'pink'],
  ['green', 'brown', 'orange', 'teal'], ['pink', 'blue', 'green', 'yellow'],
];

const assetThemes = new Map([
  ...farm.map((id) => [id, 'farm']), ...forest.map((id) => [id, 'forest']),
  ...sea.map((id) => [id, 'ocean']), ...pets.map((id) => [id, 'pets']),
  ...food.map((id) => [id, 'food']), ...vehicles.map((id) => [id, 'vehicles']),
  ...nature.map((id) => [id, 'garden']),
]);

const make = (engine, mechanic, title, params, assets, skills, note, themes = []) =>
  ({ engine, mechanic, title, params, assets: [...new Set(assets)], skills, note,
    themes: themes.length ? themes : [...new Set(assets.map((asset) => assetThemes.get(asset)).filter(Boolean))].slice(0, 3) });

const skills = {
  visual: ['visual-discrimination', 'sustained-attention'],
  memory: ['visual-memory', 'working-memory'],
  shape: ['spatial-reasoning', 'visual-discrimination'],
  logic: ['logic', 'problem-solving'],
  colors: ['creativity', 'fine-motor'],
  letters: ['letter-recognition', 'visual-discrimination'],
  language: ['phonological-awareness', 'vocabulary'],
  numbers: ['counting', 'number-sense'],
  group: ['classification', 'everyday-knowledge'],
};

function discovery(mode, title, rounds, practice, themes) {
  return make('discovery', mode === 'recall' ? 'm109' : mode === 'group' ? 'm110' : 'm108',
    title, { mode, rounds }, rounds.flatMap(({ examples, choices }) => [...examples, ...choices]),
    practice, mode === 'recall' ? 'Разгледайте картинката спокойно. Детето решава кога да я скрие и може да я види отново.'
      : mode === 'group' ? 'Назовете примерите и обсъдете какво им е общото.'
      : 'Назовете картинката. Нека детето посочи същата.', themes);
}

function matchingPictures(age, sampler, pool, topic, { recall = false, letters = false, themes } = {}) {
  const { sample } = sampler;
  const rounds = sample(pool, age === 2 ? 2 : 3).map((answer) => ({
    examples: [answer], answer,
    choices: sample([answer, ...sample(pool.filter((item) => item !== answer), age <= 3 ? 1 : 2)], age <= 3 ? 2 : 3),
    ...(letters ? { sign: upper(name(answer))[0] } : {}),
  }));
  const title = recall ? topic : topic + ': ' + rounds.map(({ answer }) => name(answer)).join(' и ');
  return discovery(recall ? 'recall' : 'match', title,
    rounds, recall ? skills.memory : letters ? ['vocabulary', 'letter-recognition'] : skills.visual, themes);
}

const groups = {
  animals: [
    [farm, [...forest, ...sea], 'Кой също живее във ферма?', 'farm'],
    [forest.slice(0, 6), [...farm, ...sea], 'Кой също може да живее в гората?', 'forest'],
    [sea, [...forest, ...farm], 'Кой също живее в морето?', 'ocean'],
  ],
  vehicles: [
    [vehicles.filter((item) => item !== 'vehicle.airplane'), ['vehicle.airplane', 'nature.cloud', 'food.bread'], 'Кое също се движи по суша?', 'vehicles'],
    [vehicles.slice(0, 3), ['vehicle.train', 'vehicle.airplane', ...farm], 'Кое също се движи по път с гуми?', 'vehicles'],
  ],
  food: [
    [fruit, ['food.carrot', 'food.bread', 'nature.leaf'], 'Кое също е плод?', 'food'],
    [food, [...vehicles, 'nature.cloud', 'shape.circle'], 'Кое също е храна?', 'food'],
  ],
};

function grouping(category, age, { pick, sample }) {
  const [members, other, clue, theme] = pick(groups[category]);
  const [answer, ...examples] = sample(members, 3);
  const choices = sample([answer, ...sample(other, age >= 5 ? 3 : age >= 4 ? 2 : 1)], 4);
  return discovery('group', clue.slice(0, -1) + ' · ' + examples.map(name).join(' и '),
    [{ answer, examples, choices, clue }], skills.group, [theme]);
}

function soundGame(age, { sample }, pool, theme) {
  const count = Math.min(pool.length, age === 2 ? 2 : age === 3 ? 3 : 4);
  const rounds = sample(pool, age <= 3 ? 2 : 3).map((sound) => ({
    sound, choices: sample([sound, ...sample(pool.filter((id) => id !== sound), count - 1)], count),
  }));
  return make('sound-match', 'm085', 'Чуй: ' + rounds.map(({ sound }) => name(sound)).join(' и '),
    { autoPlay: age <= 3, rounds }, rounds.flatMap(({ choices }) => choices), ['listening', 'auditory-memory'],
    'Чуйте записа и сравнете картинките. Може да го пуснете повторно.', [theme]);
}

function numbers(age, r, style) {
  const { pick, int, sample } = r;
  const assets = sample([...food, ...farm, ...vehicles, ...nature], 3);
  if (style === 'compare') {
    const ask = pick(['less', 'more']);
    const rounds = assets.map((id) => {
      const smaller = 1 + int(age);
      const bigger = smaller + 1 + (age <= 3 ? int(2) : 0);
      const [left, right] = sample([smaller, bigger], 2).map((count) => ({ token: assetToken(id), count }));
      return { left, right };
    });
    return make('compare', 'm042', (ask === 'less' ? 'По-малко' : 'Повече') + ': ' + assets.map(name).join(', '),
      { mode: 'count', ask, rounds }, assets, ['number-sense', 'counting'], 'Сравнете групите, като посочите по един предмет от всяка.');
  }
  if (style === 'math') {
    const op = pick(['add', 'sub']);
    const rounds = assets.map((asset) => {
      const a = 2 + int(age === 5 ? 4 : 8);
      const b = op === 'sub' ? 1 + int(a) : 1 + int(age === 5 ? 3 : 5);
      return { asset, a, b };
    });
    return make('math', op === 'add' ? 'm044' : 'm045', (op === 'add' ? 'Прибави' : 'Махни') + ': ' + assets.map(name).join(', '),
      { op, choices: 3, rounds }, assets, ['arithmetic', 'number-sense'], 'Повторете действието с малки играчки, които могат да се местят.');
  }
  const maximum = [3, 5, 8, 10, 12][age - 2];
  const minimum = age - 1;
  let count = minimum + int(maximum - minimum - 1);
  const rounds = assets.map((asset, index) => {
    if (index) count = Math.min(maximum, count + 1 + int(2));
    return { asset, count };
  });
  return make('counting', 'm039', 'Преброй: ' + assets.map(name).join(', '),
    { guided: age <= 4, choices: age === 2 ? 2 : age >= 5 ? 4 : 3, rounds }, assets, skills.numbers,
    'Посочвайте по един предмет, докато броите. Последното число казва колко са общо.');
}

function wordGame(age, { pick, sample }, style) {
  if (style === 'word') {
    const [picture, text] = pick(parts.filter(([, syllables]) => age === 6 || syllables.split(' ').length <= 3));
    const syllables = text.split(' ');
    const word = syllables.join('');
    return make('words', 'm053', 'Сглоби ' + word, { picture, word, syllables }, [picture], ['reading', 'phonological-awareness'],
      'Кажете думата на срички. Детето може да пляска веднъж за всяка сричка.');
  }
  if (style === 'initial') {
    const chosen = sample(all.filter((id) => alphabet.includes(upper(name(id))[0])), 3);
    const rounds = chosen.map((asset) => {
      const letter = upper(name(asset))[0];
      return { asset, letter, choices: sample([letter, ...sample(alphabet.filter((item) => item !== letter), age === 4 ? 1 : 2)], 3) };
    });
    return make('letters', 'm051', 'Първи звук: ' + chosen.map(name).join(', '), { mode: 'initial', rounds }, chosen,
      skills.language, 'Произнесете името бавно и чуйте с кой звук започва.');
  }
  const target = pick(age === 2 ? [...'АБВГДЕКЛМОПРСТ'] : alphabet);
  if (age === 2) {
    const other = pick(alphabet.filter((letter) => letter !== target));
    return make('letters', 'm049', 'Близнаци: „' + target + '“ и „' + other + '“',
      { mode: 'find', target, grid: sample([target, other], 2) }, [], skills.letters,
      'Назовете голямата буква и намерете същата заедно. Играта е за сравнение на очертанията.');
  }
  const r = sampler(alphabet.indexOf(target) * 601 + age * 147 + all.indexOf(pick(all)));
  const similar = r.sample(alphabet.filter((letter) => letter !== target), age === 3 ? 3 : 5);
  const count = age === 3 ? 6 : age === 4 ? 9 : age === 5 ? 12 : 15;
  const grid = Array.from({ length: count }, (_, i) => i % 3 === 0 ? target : similar[r.int(similar.length)]);
  return make('letters', 'm049', 'Открий „' + target + '“ сред ' + similar.slice(0, 3).join(', '),
    { mode: 'find', target, grid }, [], skills.letters, 'Потърсете тази буква и върху книга или табела.');
}

const recallPlaces = [
  'Горското прозорче', 'Поглед през листата', 'Край пътечката', 'Зад храста', 'До стария дъб',
  'Вратата на фермата', 'На поляната', 'Сенки край оградата', 'В далечината', 'Пред плевнята',
  'Малката кошница', 'На пазара', 'Пикник в парка', 'До кухнята', 'Край масата',
  'По улицата', 'На спирката', 'Пред гарата', 'Зад завоя', 'В края на пътя',
];
const recallPools = [forest, farm, food, vehicles];

function recallGame(age, r, attempt) {
  const place = attempt % recallPlaces.length;
  const pool = recallPools[Math.floor(place / 5)];
  return matchingPictures(age, r, pool, recallPlaces[place], { recall: true });
}

function memoryGame(age, { pick, sample }, style) {
  const pool = pick([farm, forest, food, [...sea, ...forest], [...vehicles, ...nature], all]);
  const count = age === 3 ? 3 : age === 4 ? 4 : age === 5 ? 5 : 6;
  const mode = style === 'pairs' ? 'pairs' : pick(age === 4 ? ['missing', 'sequence'] : ['missing', 'sequence', 'reverse']);
  const items = sample(pool, Math.min(pool.length, mode === 'pairs' ? count : count + 2));
  const length = mode === 'pairs' || mode === 'missing' ? count : count - 1;
  const title = { pairs: 'Двойки', missing: 'Кой се скри?', sequence: 'Запомни реда', reverse: 'Отзад напред' }[mode];
  return make('memory', mode === 'pairs' ? 'm009' : mode === 'missing' ? 'm010' : 'm012',
    title + ': ' + items.slice(0, 3).map(name).join(', '),
    { items, mode, length, flipBackMs: age === 3 ? 2400 : 1700 }, items, skills.memory,
    'Оставете време за разглеждане. Назоваването на картинките може да помогне.');
}

function rhythmGame(age, { int, sample }) {
  const choices = age <= 4 ? ['drum', 'bell'] : ['drum', 'bell', 'rest'];
  const length = age === 3 ? 3 : age === 4 ? 4 : age === 5 ? 5 : 7;
  const beats = new Set();
  while (beats.size < 3) {
    const pattern = Array.from({ length }, () => choices[int(choices.length)]);
    if (new Set(pattern).size > 1) beats.add(pattern.join(','));
  }
  const rounds = sample([...beats], 3).map((pattern) => pattern.split(','));
  const signs = { drum: '●', bell: '◆', rest: '–' };
  return make('rhythm', 'm106', 'Ритъм ' + rounds[0].map((beat) => signs[beat]).join(' '),
    { choices, guided: age === 3, beatMs: age < 5 ? 850 : 720, rounds }, [], ['auditory-memory', 'rhythm'],
    'Чуйте примера или разгледайте знаците. Повторете ритъма с пляскане, като оставяте паузите тихи.', ['music']);
}

function puzzles(age, { pick, sample, int }, style) {
  const pool = pick([farm, forest, food, vehicles, [...sea, ...nature], all]);
  if (style === 'maze') {
    const [travellerAsset, goalAsset] = sample([...forest, ...farm, ...vehicles, ...nature], 2);
    const cols = age === 4 ? 4 : age === 5 ? 5 : 6;
    const rows = cols + int(2);
    return make('maze', 'm034', 'Път за ' + name(travellerAsset) + ' до ' + name(goalAsset),
      { travellerAsset, goalAsset, cols, rows, seed: int(100000) }, [travellerAsset, goalAsset], skills.shape,
      'Огледайте завоите и посочете пътя, преди да тръгнете.');
  }
  if (style === 'pattern') {
    const [a, b, c] = sample(pool, 3);
    const repeat = pick(age <= 3 ? [[a, b]] : [[a, a, b], [a, b, b], [a, b, c], [a, b]]);
    const middle = age >= 4 && int(2) === 1;
    const sequence = [...repeat, ...repeat, ...repeat.slice(0, middle ? 2 : 1)].map((id) => assetToken(id));
    return make('pattern', middle ? 'm024' : 'm023', 'Редица: ' + repeat.map(name).join(', '),
      { sequence, gapIndex: middle ? sequence.length - 2 : sequence.length - 1, choices: new Set(repeat).size },
      repeat, ['pattern-recognition', 'logic'], 'Назовете малката група, която се повтаря.');
  }
  if (style === 'odd') {
    const [members, other] = pick([[farm, vehicles], [forest, food], [food, vehicles], [vehicles, farm]]);
    const odd = pick(other);
    const common = sample(members, age >= 5 ? 3 : 2);
    const group = sample([...common, odd], common.length + 1);
    return make('odd-one-out', 'm025', 'Кой не е от групата? · ' + common.map(name).join(', '),
      { items: group.map((id) => assetToken(id)), oddIndex: group.indexOf(odd), showGrouping: age === 4 },
      group, skills.group, 'След избора попитайте: „По какво другите си приличат?“');
  }
  const pieces = sample(pool, age === 2 ? 2 : age === 3 ? 3 : 4 + int(2));
  if (style === 'match') {
    return make('matching', age >= 3 ? 'm002' : 'm016', 'Събери двойките: ' + pieces.map(name).join(', '),
      { pairs: pieces.map((id) => ({ left: id, right: id })), rightMode: age >= 3 ? 'silhouette' : 'same' },
      pieces, skills.visual, 'Намерете една двойка и оставете детето да опита следващата.');
  }
  return make('puzzle', 'm001', 'Сенки: ' + pieces.map(name).join(', '), { pieces }, pieces, skills.shape,
    'Сравнете външните очертания. Звездичката може да посочи една двойка.');
}

function shapesGame(age, { pick, int, sample }, style) {
  const shape = pick(shapes);
  const color = pick(colors);
  if (style === 'build') {
    const choices = sample(ids('shape', 'circle square triangle star heart'), 3 + int(3));
    const model = Array.from({ length: age === 4 ? 3 : age === 5 ? 4 : 5 }, () => pick(choices));
    return make('shape-builder', 'm032', 'Построй: ' + model.map(name).join(', '), { choices, model }, choices,
      skills.shape, 'Назовете формите и възстановете реда една по една.', ['shapes']);
  }
  if (style === 'compare') {
    const ask = pick(['more', 'less']);
    const rounds = sample(shapes, 3).map((item) => {
      const [left, right] = sample([1, age <= 3 ? 0.45 : 0.6 + int(3) / 10], 2)
        .map((scale) => ({ token: shapeToken(item, color, scale), count: 1 }));
      return { left, right };
    });
    return make('compare', 'm007', ask === 'more' ? 'Коя форма е по-голяма?' : 'Коя форма е по-малка?',
      { mode: 'size', ask, rounds }, [], ['measurement', 'visual-discrimination'],
      'Покажете два подобни предмета вкъщи и сравнете размерите.', ['shapes']);
  }
  const descending = age >= 3 && int(2) === 0;
  const levels = [0.42, 0.62, 0.83, 1].slice(age === 2 ? 1 : 0);
  if (descending) levels.reverse();
  const items = levels.map((scale) => shapeToken(shape, color, scale));
  const label = { circle: 'кръгове', triangle: 'триъгълници', square: 'квадрати', star: 'звезди',
    heart: 'сърца', rectangle: 'правоъгълници', oval: 'овали', diamond: 'ромбове' }[shape];
  return make('sequencing', 'm101', (descending ? 'Смаляващи се ' : 'Растящи ') + label,
    { items, kind: descending ? 'size-desc' : 'size-asc' }, [], ['measurement', 'sequencing'],
    'Сравнявайте два размера наведнъж, после поставете следващия.', ['shapes']);
}

function painting(age, { pick, sample }, style) {
  const palette = pick(palettes);
  if (style === 'draw') {
    const [reference, title, prompt] = pick(drawingIdeas);
    const widths = age <= 3 ? [20, 34] : age === 4 ? [12, 22, 34] : [6, 12, 22, 34];
    return make('drawing', 'm069', title, { reference, prompt, palette, widths }, [reference], skills.colors,
      'Картинката е идея. Оставете детето да измисли как да я нарисува.');
  }
  const [object, title] = pick(paint);
  const lineart = 'lineart.' + object;
  return make('coloring', 'm078', title, { lineart, palette: sample(palette, age <= 2 ? 3 : 4), limitedPalette: true }, [lineart],
    skills.colors, 'Сравнете цветовете в рисунката с цветовете около вас.');
}

function shopping(age, { sample, int }) {
  const shelf = sample(food, age === 4 ? 4 : 6);
  const orders = ['Закуска', 'Пикник'].map((title) => ({
    title,
    items: sample(shelf, age === 6 ? 3 : 2).map((asset) => ({ asset, count: 1 + int(age - 2) })),
  }));
  return make('shopping', 'm103', 'Кошница: ' + orders[0].items.map(({ asset }) => name(asset)).join(' и '),
    { shelf, orders, rememberList: age >= 5 }, shelf, ['everyday-knowledge', 'working-memory', 'counting'],
    'Сравнете кошницата със списъка. Можете да повторите задачата вкъщи с играчки.', ['food']);
}

const roads = [[3, 4, 5], [3, 0, 1, 2, 5], [3, 6, 7, 8, 5], [3, 0, 1, 4, 7, 8, 5], [3, 6, 7, 4, 1, 2, 5]];

function roadGame(age, { pick, sample }) {
  const vehicle = pick(vehicles.filter((id) => !['vehicle.airplane', 'vehicle.train'].includes(id)));
  const paths = sample(age === 4 ? roads.slice(0, 3) : roads, age === 6 ? 3 : 2);
  return make('road-builder', 'm104', 'Път за ' + name(vehicle), { vehicle, paths }, [vehicle], skills.shape,
    'Намерете накъде сочат краищата на пътя, преди да завъртите плочката.', ['vehicles']);
}

function railwayGame(age, { sample }) {
  const size = age - 1;
  const cells = Array.from({ length: size * size }, (_, index) => index);
  const maxCommands = age === 4 ? 6 : age === 5 ? 9 : 13;
  const missions = [];
  const keys = new Set();
  for (let attempt = 0; attempt < 100 && missions.length < 3; attempt++) {
    const [start, goal, ...other] = sample(cells, age === 4 ? 4 : age === 5 ? 6 : 7);
    const [stop, ...obstacles] = other;
    const mission = age === 4 ? { size, start, goal, blocks: other }
      : { size, start, goal, stop, blocks: obstacles };
    const solution = routeSolution(mission);
    if (!solution || solution.length < age - 1 || solution.length > maxCommands) continue;
    const key = JSON.stringify(mission);
    if (keys.has(key)) continue;
    keys.add(key);
    missions.push(mission);
  }
  if (missions.length < 3) return null;
  const first = missions[0];
  return make('route-program', 'm105', 'Влак до гара ' + (first.goal + 1) + ' от ' + (first.start + 1),
    { maxCommands, missions }, ['vehicle.train'], ['sequencing', 'spatial-reasoning', 'problem-solving'],
    'Посочете маршрута, преди да наредите стрелките. Ако влакът спре, поправете първата неподходяща команда.', ['vehicles', 'city']);
}

export function recipe(category, age, attempt) {
  const r = sampler(age * 11783 + attempt * 14983 + 7771);
  const turn = (list) => list[attempt % list.length];
  switch (category) {
    case 'colors': return painting(age, r, age === 2 ? 'paint' : turn(['draw', 'draw', 'paint']));
    case 'letters':
      if (age === 2) return attempt % 2 ? wordGame(age, r, 'find')
        : matchingPictures(age, r, all, 'Картинки и букви', { letters: true });
      return wordGame(age, r, age === 3 ? 'find' : age === 4 ? turn(['find', 'initial']) : turn(['word', 'initial', 'word', 'find']));
    case 'numbers': return numbers(age, r, age === 2 ? 'count' : age < 5 ? turn(['count', 'compare']) : turn(['math', 'compare', 'count']));
    case 'memory':
      if (age === 2 || (age === 3 && attempt % 4 === 3)) return recallGame(age, r, attempt);
      if (attempt % 4 === 1) return rhythmGame(age, r);
      return memoryGame(age, r, age === 3 ? 'pairs' : turn(['pairs', 'challenge', 'challenge']));
    case 'puzzles':
      return puzzles(age, r, age === 2 ? turn(['puzzle', 'match']) : age === 3 ? turn(['pattern', 'puzzle', 'match'])
        : age === 4 ? turn(['maze', 'pattern', 'puzzle', 'odd', 'match']) : turn(['maze', 'pattern', 'odd', 'match']));
    case 'shapes':
      return shapesGame(age, r, age < 4 ? turn(['order', 'compare']) : age < 6 ? turn(['build', 'order', 'compare']) : turn(['build', 'order']));
    case 'animals':
      if (age === 2) return attempt % 2 ? soundGame(age, r, sounds, 'farm')
        : matchingPictures(age, r, r.pick([farm, forest, sea]), 'Намери животното');
      return attempt % 3 === 1 ? soundGame(age, r, sounds, 'farm') : grouping(category, age, r);
    case 'vehicles':
      if (age === 2) return attempt % 2 ? soundGame(age, r, vehicles, 'vehicles')
        : matchingPictures(age, r, vehicles, 'Намери превозното средство', { themes: ['vehicles'] });
      if (age >= 4 && attempt % 4 === 1) return roadGame(age, r);
      if (age >= 4 && attempt % 4 === 2) return railwayGame(age, r);
      return attempt % 4 === 0 ? grouping(category, age, r) : soundGame(age, r, vehicles, 'vehicles');
    case 'food':
      if (age === 2) return matchingPictures(age, r, food, 'Намери храната', { themes: ['food'] });
      if (age >= 4 && attempt % 2) return shopping(age, r);
      return grouping(category, age, r);
  }
}
