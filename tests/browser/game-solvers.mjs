import { expect } from '@playwright/test';
import { bg } from '../../src/i18n/bg.ts';
import { schemaFor } from '../../src/engines/schemas.ts';
import { variantRandom } from '../../src/engines/shared/variant.ts';
import { shuffle } from '../../src/engines/shared/random.ts';
import { countingVariant } from '../../src/engines/counting/variants.ts';
import { compareVariant } from '../../src/engines/compare/variants.ts';
import { lettersVariant } from '../../src/engines/letters/variants.ts';
import { patternVariant } from '../../src/engines/pattern/variants.ts';
import { sequencingVariant } from '../../src/engines/sequencing/variants.ts';
import { sortingVariant } from '../../src/engines/sorting/variants.ts';
import { soundMatchVariant } from '../../src/engines/sound-match/variants.ts';
import { generateMaze, canMove } from '../../src/engines/shared/generators/maze.ts';
import { routeSolution } from '../../src/engines/route-program/schema.ts';
import { BLUEPRINTS } from '../../src/engines/shape-builder/blueprints.ts';
import { shapeLabel } from '../../src/engines/shared/shapeNames.ts';

export const label = (id) => bg['asset.' + id];
const tokenName = (token) =>
  token.kind === 'asset' ? label(token.id) : shapeLabel(token.shape, token.color);
const variants = {
  counting: countingVariant,
  compare: compareVariant,
  letters: lettersVariant,
  pattern: patternVariant,
  sorting: sortingVariant,
  'sound-match': soundMatchVariant,
};

function parameters(activity, variant) {
  const parsed = schemaFor(activity.engine).paramsSchema.parse(activity.params);
  if (activity.engine === 'sequencing') return sequencingVariant(parsed, variant);
  return variant && variants[activity.engine]
    ? variants[activity.engine](parsed, variantRandom(activity.id, variant))
    : parsed;
}

// These drivers use visible controls. Expected answers come from authored tasks,
// but completion, progress and saved results must be produced by real UI actions.
export async function solveGame(page, activity, variant, evidence) {
  const p = parameters(activity, variant);
  const game = page.locator('.playful-game');
  let action = 0;
  const activate = async (button) => {
    await expect(button).toBeEnabled();
    if (action++ % 2) await button.press('Enter');
    else await button.tap();
    evidence.actions++;
  };
  const button = (name) => game.getByRole('button', { name, exact: true });
  const tick = async (ms = 2000) => {
    await page.clock.runFor(ms);
  };
  const wrong = async (target) => {
    await activate(target);
    evidence.wrongAttempts++;
  };
  const tokenButton = async (token) => {
    const candidates = button(tokenName(token));
    for (let i = 0; i < (await candidates.count()); i++) {
      const candidate = candidates.nth(i);
      const scale = await candidate.evaluate((node) => {
        const scaled = node.querySelector('[style*="scale("]');
        return scaled ? Number(/scale\(([\d.]+)\)/.exec(scaled.style.transform)?.[1]) : 1;
      });
      if (Math.abs(scale - (token.scale ?? 1)) < 0.001) return candidate;
    }
    throw new Error('No visible token ' + JSON.stringify(token));
  };

  switch (activity.engine) {
    case 'puzzle': {
      const pieces = game.getByRole('group', { name: 'Картинки', exact: true });
      const holes = game.getByRole('group', { name: 'Сенки', exact: true });
      await activate(button('Подсказка'));
      evidence.hints++;
      const first = p.pieces[0],
        other = p.pieces[1];
      await activate(pieces.getByRole('button', { name: label(first), exact: true }));
      await wrong(holes.getByRole('button', { name: 'Сянка: ' + label(other), exact: true }));
      await expect(
        pieces.getByRole('button', { name: label(first), exact: true }),
      ).toBeVisible();
      for (const [index, id] of p.pieces.entries()) {
        const piece = pieces.getByRole('button', { name: label(id), exact: true });
        const hole = holes.getByRole('button', { name: 'Сянка: ' + label(id), exact: true });
        await activate(index % 2 ? hole : piece);
        await activate(index % 2 ? piece : hole);
      }
      break;
    }
    case 'matching': {
      const columns = game.locator('div[class*="_column_"]');
      const left = columns.nth(0),
        right = columns.nth(1);
      const rightName = (id) => (p.rightMode === 'silhouette' ? 'сянка: ' : '') + label(id);
      await activate(left.getByRole('button', { name: label(p.pairs[0].left), exact: true }));
      await wrong(
        right.getByRole('button', { name: rightName(p.pairs[1].right), exact: true }),
      );
      for (const [index, pair] of p.pairs.entries()) {
        const a = left.getByRole('button', { name: label(pair.left), exact: true });
        const b = right.getByRole('button', { name: rightName(pair.right), exact: true });
        await activate(index % 2 ? b : a);
        await activate(index % 2 ? a : b);
      }
      break;
    }
    case 'sorting': {
      const bin = (id) =>
        button('кошница: ' + label(p.bins.find((item) => item.id === id).asset));
      const items = () => game.locator('button[data-draggable]');
      const first = p.items[0];
      await activate(
        items()
          .and(button(label(first.asset)))
          .first(),
      );
      await wrong(bin(p.bins.find((item) => item.id !== first.bin).id));
      for (const [index, item] of p.items.entries()) {
        const piece = items()
          .and(button(label(item.asset)))
          .first();
        await activate(index % 2 ? bin(item.bin) : piece);
        await activate(index % 2 ? piece : bin(item.bin));
      }
      break;
    }
    case 'counting':
      for (const round of p.rounds) {
        for (let i = 0; i < round.count; i++)
          await activate(button(label(round.asset) + ' ' + (i + 1)));
        await wrong(
          game
            .getByRole('button')
            .filter({ hasText: /^\d+$/ })
            .filter({
              hasNotText: new RegExp('^' + round.count + '$'),
            })
            .first(),
        );
        await activate(button(String(round.count)));
        await tick(1000);
      }
      break;
    case 'compare':
      for (const round of p.rounds) {
        const left = p.mode === 'size' ? round.left.token.scale : round.left.count;
        const right = p.mode === 'size' ? round.right.token.scale : round.right.count;
        const winner = p.ask === 'more' ? left > right : left < right;
        await wrong(button(winner ? 'дясната страна' : 'лявата страна'));
        await activate(button(winner ? 'лявата страна' : 'дясната страна'));
        await tick(1500);
      }
      break;
    case 'math':
      for (const round of p.rounds) {
        const result = p.op === 'add' ? round.a + round.b : round.a - round.b;
        const answers = game.getByRole('button');
        const correct = button(result + ' ' + label(round.asset));
        await wrong(answers.filter({ hasNotText: new RegExp('^' + result + '$') }).first());
        await activate(correct);
        await tick(1400);
      }
      break;
    case 'letters':
      if (p.mode === 'find') {
        const other = p.grid.find((letter) => letter !== p.target);
        if (other) await wrong(button(other).first());
        for (const target of await button(p.target).all()) await activate(target);
      } else
        for (const round of p.rounds) {
          await wrong(button(round.choices.find((letter) => letter !== round.letter)));
          await activate(button(round.letter));
          await tick(1700);
        }
      break;
    case 'pattern': {
      const answer = p.sequence[p.gapIndex];
      const alternatives = game.getByRole('button');
      const correct = await tokenButton(answer);
      if ((await alternatives.count()) > 1) {
        for (const candidate of await alternatives.all()) {
          if (
            await candidate.evaluate(
              (node, answer) => node.getAttribute('aria-label') !== answer,
              tokenName(answer),
            )
          ) {
            await wrong(candidate);
            break;
          }
        }
      }
      await activate(correct);
      await tick(1600);
      break;
    }
    case 'odd-one-out':
      await wrong(await tokenButton(p.items.find((_, index) => index !== p.oddIndex)));
      await activate(await tokenButton(p.items[p.oddIndex]));
      await tick(1800);
      break;
    case 'sequencing':
      await wrong(await tokenButton(p.items[p.items.length - 1]));
      for (const item of p.items) await activate(await tokenButton(item));
      break;
    case 'memory':
      if (p.mode === 'pairs') {
        const cards = game.locator('button[aria-pressed]');
        const remembered = new Map();
        let pairsSolved = 0;
        for (let i = 0; i < p.items.length * 2; i += 2) {
          await activate(cards.nth(i));
          await expect(cards.nth(i)).toHaveAttribute('aria-pressed', 'true');
          const first = await cards.nth(i).getAttribute('aria-label');
          await activate(cards.nth(i + 1));
          if (pairsSolved === p.items.length - 1) return;
          await expect(cards.nth(i + 1)).toHaveAttribute('aria-pressed', 'true');
          const second = await cards.nth(i + 1).getAttribute('aria-label');
          for (const [name, index] of [
            [first, i],
            [second, i + 1],
          ]) {
            remembered.set(name, [...(remembered.get(name) ?? []), index]);
          }
          if (first !== second) {
            evidence.wrongAttempts++;
            await tick(1500);
            await expect(cards.nth(i)).toHaveAttribute('aria-pressed', 'false');
            await expect(cards.nth(i + 1)).toHaveAttribute('aria-pressed', 'false');
          } else pairsSolved++;
        }
        for (const indices of remembered.values()) {
          if ((await cards.nth(indices[0]).getAttribute('aria-pressed')) === 'true') continue;
          await activate(cards.nth(indices[0]));
          await activate(cards.nth(indices[1]));
          pairsSolved++;
          if (pairsSolved === p.items.length) return;
        }
      } else {
        for (let task = 0; task < 3; task++) {
          const random = variantRandom(activity.id, variant * 3 + task);
          const sequence = shuffle(p.items, random).slice(0, p.length);
          const missing = Math.floor(random() * sequence.length);
          const expected =
            p.mode === 'missing'
              ? [sequence[missing]]
              : p.mode === 'reverse'
                ? [...sequence].reverse()
                : sequence;
          await activate(button('Запомних →'));
          await activate(button('Покажи отново'));
          evidence.hints++;
          await activate(button('Запомних →'));
          await wrong(button(label(p.items.find((item) => item !== expected[0]))));
          for (const item of expected) await activate(button(label(item)));
          await tick(1200);
        }
      }
      break;
    case 'discovery':
      for (const round of p.rounds) {
        if (p.mode === 'recall') {
          await activate(button('Продължи'));
          await activate(button('Покажи пак'));
          evidence.hints++;
          await activate(button('Продължи'));
        }
        await wrong(button(label(round.choices.find((item) => item !== round.answer))));
        await activate(button(label(round.answer)));
        await activate(game.getByRole('button', { name: /^(Продължи|Готово)$/ }));
      }
      break;
    case 'semantic-choice':
      for (const round of p.rounds) {
        await wrong(button(label(round.choices.find((item) => item !== round.answer))));
        await activate(button(label(round.answer)));
        await expect(game.getByText(round.explanation, { exact: true })).toBeVisible();
        await activate(game.getByRole('button', { name: /^(Следваща задача|Готово!)$/ }));
      }
      break;
    case 'sound-match':
      for (const round of p.rounds) {
        await activate(button('Чуй'));
        await wrong(button(label(round.choices.find((item) => item !== round.sound))));
        await tick(350);
        await activate(button(label(round.sound)));
        await tick(1600);
      }
      break;
    case 'words':
      for (const [index, part] of p.syllables.entries()) {
        if (!index) {
          const other = p.syllables.find((value) => value !== part);
          if (other) await wrong(button(other).first());
        }
        await activate(button(part).and(game.locator('button:not(:disabled)')).first());
      }
      await tick(750);
      break;
    case 'shape-builder': {
      const model = p.blueprint
        ? BLUEPRINTS[p.blueprint].pieces.map(({ shape }) => 'shape.' + shape)
        : p.model;
      for (const id of model) {
        const target = button('Постави ' + label(id).toLowerCase());
        await wrong(target);
        await activate(
          game
            .getByRole('group', { name: 'Избери форма' })
            .getByRole('button', { name: label(id), exact: true }),
        );
        await activate(target);
      }
      await tick(1900);
      break;
    }
    case 'tracing':
    case 'connect-dots':
      await wrong(button('точка 2'));
      for (let i = 0; i < p.points.length; i++) await activate(button('точка ' + (i + 1)));
      await tick(800);
      break;
    case 'spot-difference':
      for (const [index, target] of p.targets.entries()) {
        const count = p.targets.slice(0, index).filter((item) => item.id === target.id).length;
        await activate(button('Намери: ' + label(target.id)).nth(count));
      }
      await tick(1000);
      break;
    case 'coloring': {
      await expect(game.locator('canvas')).toHaveAttribute(
        'aria-label',
        /Рисунка за оцветяване/,
      );
      await game.getByText('Оцветяване с клавиатура', { exact: true }).click();
      const regions = game.getByRole('combobox');
      const count = await regions.locator('option').count();
      expect(count).toBeGreaterThan(0);
      for (let region = 1; region <= count; region++) {
        await regions.selectOption(String(region));
        await activate(button('Оцвети избраната зона'));
      }
      await activate(button('Върни последния цвят'));
      await activate(button('Оцвети избраната зона'));
      await activate(button('Готово!'));
      evidence.coloredRegions = (evidence.coloredRegions ?? 0) + count;
      break;
    }
    case 'drawing': {
      const canvas = game.locator('canvas');
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      await page.mouse.move(box.x + 30, box.y + 30);
      await page.mouse.down();
      await page.mouse.move(box.x + 90, box.y + 90, { steps: 8 });
      await page.mouse.up();
      await activate(button('Изтрий'));
      await canvas.tap({ position: { x: 55, y: 55 } });
      await activate(button('Готово'));
      break;
    }
    case 'maze': {
      const maze = generateMaze(p.cols, p.rows, p.seed);
      const queue = [{ point: maze.start, path: [] }],
        seen = new Set(['0,0']);
      const directions = [
        ['ArrowUp', 0, -1],
        ['ArrowRight', 1, 0],
        ['ArrowDown', 0, 1],
        ['ArrowLeft', -1, 0],
      ];
      let solution;
      for (let i = 0; i < queue.length; i++) {
        const { point, path } = queue[i];
        if (point.x === maze.goal.x && point.y === maze.goal.y) {
          solution = path;
          break;
        }
        for (const [key, dx, dy] of directions) {
          const next = { x: point.x + dx, y: point.y + dy },
            token = next.x + ',' + next.y;
          if (seen.has(token) || !canMove(maze, point, next)) continue;
          seen.add(token);
          queue.push({ point: next, path: [...path, key] });
        }
      }
      expect(solution?.length).toBeGreaterThan(0);
      const board = game.getByRole('application');
      await board.press('ArrowUp');
      for (const key of solution) {
        await board.press(key);
        evidence.actions++;
      }
      break;
    }
    case 'road-builder':
      for (const path of p.paths) {
        // Every authored road starts rotated once. A half-turn solves straight
        // pieces, and a full turn solves all pieces, including corners.
        for (const cell of path) {
          const tile = button('Завърти отсечка ' + (cell + 1));
          for (let i = 0; i < 3; i++) {
            if (await tile.isDisabled()) break;
            await activate(tile);
          }
        }
        await tick(1700);
      }
      break;
    case 'route-program': {
      const names = { up: 'Нагоре', down: 'Надолу', left: 'Наляво', right: 'Надясно' };
      for (const mission of p.missions) {
        await activate(button('Покажи пример'));
        evidence.hints++;
        const solution = routeSolution(mission);
        expect(solution?.length).toBeGreaterThan(0);
        for (const step of solution) await activate(button(names[step]));
        await activate(button('Пусни влакчето'));
        await tick((solution.length + 2) * 650);
        await activate(game.getByRole('button', { name: /^(Към следващата гара|Готово!)$/ }));
      }
      break;
    }
    case 'rhythm': {
      const names = { drum: 'Бум', bell: 'Дин', rest: 'Пауза' };
      for (const target of p.rounds) {
        await activate(button('Чуй примера'));
        await tick(target.length * p.beatMs + 300);
        const show = button('Покажи ритъма със символи');
        if (await show.count()) {
          await activate(show);
          evidence.hints++;
        }
        for (const beat of target) await activate(button(names[beat]));
        await activate(button('Провери ритъма'));
        await activate(game.getByRole('button', { name: /^(Следващ ритъм|Готово!)$/ }));
      }
      break;
    }
    case 'garden':
      if (p.mode === 'grow') {
        if (!p.waterAtStart) await activate(button('Без вода'));
        if (!p.lightAtStart) await activate(button('На тъмно'));
      } else
        await activate(
          game.getByRole('group', { name: 'Избери саксия' }).getByRole('button').first(),
        );
      await activate(button('Виж какво ще стане'));
      await activate(button('Готово'));
      break;
    case 'shopping':
      for (const order of p.orders) {
        if (p.rememberList) {
          await activate(button('Запомних — скрий списъка'));
          await activate(button('Покажи списъка отново'));
          evidence.hints++;
          await activate(button('Запомних — скрий списъка'));
        }
        const extra =
          p.shelf.find((item) => !order.items.some(({ asset }) => asset === item)) ??
          order.items[0].asset;
        await activate(button('Добави ' + label(extra)));
        await wrong(button('Провери кошницата'));
        await expect(game.getByRole('status')).toContainText('Сравни кошницата');
        await activate(button('Върни ' + label(extra)));
        for (const item of order.items) {
          for (let count = 0; count < item.count; count++)
            await activate(button('Добави ' + label(item.asset)));
        }
        await activate(button('Провери кошницата'));
        await tick(1500);
      }
      break;
    default:
      throw new Error('No UI solver for ' + activity.engine);
  }
}
