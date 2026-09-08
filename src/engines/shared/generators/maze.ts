import { makeRandom } from '../random';

/**
 * Генератор на лабиринти — T5.2.
 *
 * Един ред параметри в JSON-а дава безкрайни различни лабиринти. Това е
 * реалният път до 500+ активности: обемът идва от генераторите, не от
 * ръчно написани файлове.
 *
 * Алгоритъмът е „рекурсивно връщане назад“: дава лабиринт с ТОЧНО ЕДИН
 * път между всеки две клетки. За дете това е важно — няма примки, в които
 * да се върти, и всяко задънено разклонение свършва бързо.
 */

export type Cell = {
  /** Стена в съответната посока. */
  n: boolean;
  e: boolean;
  s: boolean;
  w: boolean;
};

export type Maze = {
  cols: number;
  rows: number;
  /** Ред по ред, отгоре надолу. */
  cells: Cell[][];
  start: { x: number; y: number };
  goal: { x: number; y: number };
};

type Dir = 'n' | 'e' | 's' | 'w';

const STEP: Record<Dir, { dx: number; dy: number; opposite: Dir }> = {
  n: { dx: 0, dy: -1, opposite: 's' },
  e: { dx: 1, dy: 0, opposite: 'w' },
  s: { dx: 0, dy: 1, opposite: 'n' },
  w: { dx: -1, dy: 0, opposite: 'e' },
};

export function generateMaze(cols: number, rows: number, seed: number): Maze {
  const random = makeRandom(seed);

  const cells: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ n: true, e: true, s: true, w: true })),
  );

  const visited = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));

  // Стек вместо рекурсия: при 12x12 рекурсията стига 144 нива, което е
  // безопасно, но стекът е и по-лесен за проследяване.
  const stack: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  visited[0]![0] = true;

  while (stack.length > 0) {
    const current = stack[stack.length - 1]!;

    const options = (Object.keys(STEP) as Dir[]).filter((dir) => {
      const nx = current.x + STEP[dir].dx;
      const ny = current.y + STEP[dir].dy;
      return nx >= 0 && ny >= 0 && nx < cols && ny < rows && !visited[ny]![nx];
    });

    if (options.length === 0) {
      stack.pop();
      continue;
    }

    const dir = options[Math.floor(random() * options.length)]!;
    const nx = current.x + STEP[dir].dx;
    const ny = current.y + STEP[dir].dy;

    cells[current.y]![current.x]![dir] = false;
    cells[ny]![nx]![STEP[dir].opposite] = false;
    visited[ny]![nx] = true;
    stack.push({ x: nx, y: ny });
  }

  return {
    cols,
    rows,
    cells,
    start: { x: 0, y: 0 },
    goal: { x: cols - 1, y: rows - 1 },
  };
}

/** Може ли да се мине от една клетка към съседна. */
export function canMove(maze: Maze, from: { x: number; y: number }, to: { x: number; y: number }): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return false;

  const dir: Dir = dx === 1 ? 'e' : dx === -1 ? 'w' : dy === 1 ? 's' : 'n';
  return cellAt(maze, from.x, from.y)?.[dir] === false;
}

export function cellAt(maze: Maze, x: number, y: number): Cell | null {
  return maze.cells[y]?.[x] ?? null;
}
