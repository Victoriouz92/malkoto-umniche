import { BLUEPRINTS } from '@/engines/shape-builder/blueprints';
import type { BlueprintId, BuildingPiece } from '@/engines/shape-builder/blueprints';
/** Pure cover descriptions: reusable by the UI and the catalogue checker. */
export type CoverSource = { id: string; engine: string; assets: readonly string[]; params: unknown };
export type Picture = { kind: 'asset'; value: string } | { kind: 'text'; value: string } |
  { kind: 'shape'; value: string; color: string };
export type CoverItem = { picture: Picture; x: number; y: number; size: number; muted?: boolean; rotation?: number };
export type CoverModel = {
  layout: string;
  items: CoverItem[];
  caption: string;
  path: string;
  palette: number;
};
export const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const str = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback;
const num = (value: unknown, fallback = 1): number => typeof value === 'number' ? value : fallback;
const text = (value: string): Picture => ({ kind: 'text', value });
const asset = (value: string): Picture => ({ kind: 'asset', value });
function picture(value: unknown): Picture {
  if (typeof value === 'string') return value.includes('.') ? asset(value) : text(value);
  const token = record(value);
  if (token.kind === 'shape') return { kind: 'shape', value: str(token.shape), color: str(token.color, 'teal') };
  return asset(str(token.id ?? token.asset));
}

/** Each scene uses the actual rules/objects; no unrelated fallback animals. */
export function describeCover(source: CoverSource, palette: number): CoverModel {
  const p = record(source.params);
  const rounds = array(p.rounds).map(record);
  const first = rounds[0] ?? {};
  const model: CoverModel = { layout: source.engine, items: [], caption: '', path: '', palette };
  const put = (pic: Picture, x: number, y: number, size: number, muted = false) =>
    model.items.push({ picture: pic, x, y, size, muted });
  const row = (values: unknown[], y = 77, size = 48) => values.forEach((v, i) =>
    put(picture(v), 150 + (i - (values.length - 1) / 2) * (size + 10), y, size));

  switch (source.engine) {
    case 'shopping': {
      const order = record(array(p.orders)[0]);
      const items = array(order.items).map(record);
      items.forEach((item, i) => {
        put(asset(str(item.asset)), 90 + i * 110, 70, 63);
        put(text(`×${num(item.count)}`), 90 + i * 110, 124, 29);
      });
      model.caption = 'Напълни кошницата по списък';
      break;
    }
    case 'road-builder':
      model.path = 'M53 100 H100 V45 H197 V100 H250';
      put(asset(str(p.vehicle)), 51, 106, 47);
      put(text('⚑'), 251, 93, 36);
      model.caption = 'Завърти и свържи пътя';
      break;
    case 'counting': {
      const n = num(first.count);
      const columns = Math.min(5, n);
      for (let i = 0; i < n; i++) put(asset(str(first.asset)),
        113 + ((i % columns) - (columns - 1) / 2) * 33, n > 5 ? 57 + Math.floor(i / columns) * 38 : 78, 31);
      put(text(String(n)), 248, 78, 52);
      model.caption = 'Преброй и избери';
      break;
    }
    case 'memory': {
      const items = array(p.items).map(String);
      const sample = items[0] ?? '';
      [70, 150, 230].forEach((x, i) => put(i === 2 ? text('?') : asset(sample), x, 77, 54));
      model.caption = `${items.length} двойки`;
      // Show another real card to distinguish themed sets with the same first card.
      if (items[1]) put(asset(items[1]), 246, 128, 24);
      break;
    }
    case 'letters':
      if (p.mode === 'find') {
        const target = str(p.target);
        const others = [...new Set(array(p.grid).map(String))].filter(v => v !== target).slice(0, 2);
        row([others[0] ?? target, target, others[1] ?? target], 77, 48);
        model.caption = `Открий ${target}`;
      } else {
        put(asset(str(first.asset)), 99, 76, 79);
        put(text(str(first.letter)), 217, 76, 60);
        model.caption = 'С коя буква започва?';
      }
      break;
    case 'math':
      row([String(first.a), p.op === 'sub' ? '−' : '+', String(first.b)], 75, 45);
      if (first.asset) put(asset(str(first.asset)), 150, 126, 29);
      model.caption = p.op === 'sub' ? 'Колко остават?' : 'Колко са общо?';
      break;
    case 'words':
      put(asset(str(p.picture)), 150, 56, 68);
      row(array(p.syllables), 120, 38);
      model.caption = 'Сглоби думата';
      break;
    case 'matching': {
      const pair = record(array(p.pairs)[0]);
      put(asset(str(pair.left)), 77, 77, 62);
      put(text('↔'), 150, 77, 30);
      put(asset(str(pair.right)), 224, 77, 62, p.rightMode === 'silhouette');
      model.caption = `${p.rightMode === 'silhouette' ? 'Открий сянката' : 'Свържи'} · ${array(p.pairs).length} двойки`;
      break;
    }
    case 'compare': {
      const left = record(first.left), right = record(first.right);
      if (p.mode === 'count') {
        for (const [side, cx] of [[left, 77], [right, 222]] as const) {
          const n = num(side.count);
          for (let i = 0; i < n; i++) put(picture(side.token), cx + ((i % 3) - 1) * 27,
            54 + Math.floor(i / 3) * 27, 26);
        }
      } else {
        put(picture(left.token), 80, 78, 80 * num(record(left.token).scale));
        put(picture(right.token), 219, 78, 80 * num(record(right.token).scale));
      }
      put(text('?'), 150, 76, 25);
      model.caption = p.mode === 'count'
        ? (p.ask === 'less' ? 'Къде са по-малко?' : 'Къде са повече?')
        : (p.ask === 'less' ? 'Кое е по-малко?' : 'Кое е по-голямо?');
      break;
    }
    case 'pattern': {
      const seq = array(p.sequence);
      row(seq.slice(0, 4).map((v, i) => i === Math.min(num(p.gapIndex, seq.length - 1), 3) ? '?' : v), 80, 44);
      model.caption = 'Продължи редицата';
      break;
    }
    case 'sequencing': {
      const items = array(p.items).slice(0, 4);
      items.forEach((v, i) => put(picture(v), 63 + i * 58, 80, 62 * num(record(v).scale)));
      model.caption = p.kind === 'size-desc' ? 'От голямо към малко' : 'От малко към голямо';
      break;
    }
    case 'odd-one-out': {
      const items = array(p.items);
      const oddIndex = num(p.oddIndex, 0);
      // Always include the outlier, even when it is beyond the preview limit.
      const shown = items.slice(0, 4);
      if (oddIndex >= 4) shown[3] = items[oddIndex];
      shown.forEach((v, i) => put(picture(v), 150 + (i - (shown.length - 1) / 2) * 54, 80, 44 * num(record(v).scale)));
      model.caption = 'Открий различното';
      break;
    }
    case 'coloring':
      put(asset(str(p.lineart)), 150, 75, 104);
      array(p.palette).slice(0, 6).forEach((color, i) =>
        put({ kind: 'shape', value: 'circle', color: str(color) }, 78 + i * 29, 148, 15));
      model.caption = 'Оцвети по свой начин';
      break;
    case 'drawing':
      model.path = 'M55 104 Q75 22 113 88 T182 70 T245 53';
      model.caption = 'Твоето малко ателие';
      break;
    case 'maze':
      model.path = 'M65 104 H105 V47 H165 V108 H231 V63';
      put(asset(str(p.travellerAsset)), 57, 111, 42);
      put(asset(str(p.goalAsset)), 232, 47, 44);
      model.caption = `Намери пътя · ${num(p.cols)} × ${num(p.rows)}`;
      break;
    case 'tracing':
    case 'connect-dots': {
      const pts = array(p.points).map(record);
      model.path = pts.map((v, i) => `${i ? 'L' : 'M'}${45 + num(v.x) * 2.1} ${20 + num(v.y) * 1.12}`).join(' ');
      if (source.engine === 'tracing') put(text(str(p.guide)), 259, 115, 28);
      model.caption = source.engine === 'tracing' ? 'Следвай линията' : `Свържи ${pts.length} точки`;
      break;
    }
    case 'sorting':
      row(array(p.bins).map(v => record(v).asset), 77, 52);
      model.caption = 'Всяко нещо на мястото си';
      break;
    case 'sound-match':
      row(array(first.choices).slice(0, 3), 78, 60);
      put(text('♪'), 252, 42, 32);
      model.caption = `Чуй и познай · ${array(first.choices).length} избора`;
      break;
    case 'shape-builder': {
      const blueprint = typeof p.blueprint === 'string' && Object.hasOwn(BLUEPRINTS, p.blueprint)
        ? BLUEPRINTS[p.blueprint as BlueprintId] : undefined;
      if (blueprint) {
        if (p.blueprint === 'flower') model.path = 'M150 69V135';
        blueprint.pieces.forEach((piece: BuildingPiece) => model.items.push({
          picture: { kind: 'shape', value: piece.shape, color: piece.color },
          x: 85 + piece.x * 1.3, y: 14 + piece.y * 1.3, size: piece.size * 1.3,
          rotation: piece.rotation ?? 0,
        }));
      } else row(array(p.model), 79, 48);
      model.caption = 'Построй от форми';
      break;
    }
    case 'semantic-choice':
      row(array(first.choices).slice(0, 3), 77, 62);
      model.caption = str(first.prompt);
      break;
    case 'spot-difference':
      row(array(p.targets).slice(0, 3).map(v => record(v).id), 77, 58);
      model.caption = 'Открий скритите съкровища';
      break;
    default:
      row(source.assets.slice(0, 3), 78, 60);
      model.caption = 'Подреди картинката';
  }
  return model;
}
