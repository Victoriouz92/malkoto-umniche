import { useEffect, useMemo, useRef, useState } from 'react';
import { Asset } from '@/assets/Asset';
import { assetLabel } from '@/i18n';
import { canMove, generateMaze } from '../shared/generators/maze';
import type { EngineProps } from '../types';
import type { MazeParams } from './schema';
import s from '../shared/engine.module.css';
import m from './Engine.module.css';

/** Логически размер на една клетка. Мащабът се задава от CSS. */
const CELL = 20;
const WALL = 2.6;

/**
 * „Лабиринт“.
 *
 * Правила от каталога (m034), които не са украса:
 *   • допирът до стена СПИРА движението, не връща в началото
 *   • пътят е широк — не изисква прецизност
 *   • няма време и няма провал
 *
 * Движението е по клетки, не по пиксели: пръстът може да реже ъглите и
 * да излиза от пътя, стига да минава през съседни свързани клетки. Това
 * е разликата между играещо тригодишно и разочаровано тригодишно.
 */
export function MazeEngine({ params, api, onComplete, onProgress }: EngineProps<MazeParams>) {
  const maze = useMemo(
    () => generateMaze(params.cols, params.rows, params.seed),
    [params.cols, params.rows, params.seed],
  );

  const [path, setPath] = useState([maze.start]);
  const [reached, setReached] = useState(false);

  const startedAt = useRef(Date.now());
  const bumps = useRef(0);
  const lastBump = useRef(0);
  const finished = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const here = path[path.length - 1] ?? maze.start;
  const total = maze.cols + maze.rows - 2;
  const distance = here.x + here.y;

  useEffect(() => {
    onProgress(Math.min(1, distance / Math.max(1, total)));
  }, [distance, total, onProgress]);

  useEffect(() => {
    if (!reached || finished.current) return;
    finished.current = true;
    api.sfx('complete');
    api.celebrate();
    onComplete({
      completed: true,
      durationMs: Date.now() - startedAt.current,
      correct: path.length,
      attempts: path.length + bumps.current,
      hintsUsed: 0,
    });
  }, [reached, api, onComplete, path.length]);

  /** Превръща координати на пръста в клетка от лабиринта. */
  const cellFromPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = Math.floor(((clientX - rect.left) / rect.width) * maze.cols);
    const y = Math.floor(((clientY - rect.top) / rect.height) * maze.rows);
    if (x < 0 || y < 0 || x >= maze.cols || y >= maze.rows) return null;
    return { x, y };
  };

  const move = (clientX: number, clientY: number) => {
    if (reached) return;
    const target = cellFromPoint(clientX, clientY);
    if (!target) return;
    if (target.x === here.x && target.y === here.y) return;

    // Връщане назад по вече изминатото — винаги позволено.
    const previous = path[path.length - 2];
    if (previous && previous.x === target.x && previous.y === target.y) {
      setPath((p) => p.slice(0, -1));
      return;
    }

    if (!canMove(maze, here, target)) {
      // Стената спира, но не наказва. Звукът е рядък, за да не дразни.
      const now = Date.now();
      if (now - lastBump.current > 500) {
        lastBump.current = now;
        bumps.current += 1;
        api.sfx('soften');
      }
      return;
    }

    api.sfx('tap');
    setPath((p) => [...p, target]);

    if (target.x === maze.goal.x && target.y === maze.goal.y) {
      api.haptic('success');
      setReached(true);
    }
  };

  const width = maze.cols * CELL;
  const height = maze.rows * CELL;

  const walls: string[] = [];
  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      const cell = maze.cells[y]?.[x];
      if (!cell) continue;
      const left = x * CELL;
      const top = y * CELL;
      if (cell.n) walls.push(`M${left} ${top} H${left + CELL}`);
      if (cell.w) walls.push(`M${left} ${top} V${top + CELL}`);
      if (y === maze.rows - 1 && cell.s) walls.push(`M${left} ${top + CELL} H${left + CELL}`);
      if (x === maze.cols - 1 && cell.e) walls.push(`M${left + CELL} ${top} V${top + CELL}`);
    }
  }

  const trail = path
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x * CELL + CELL / 2} ${c.y * CELL + CELL / 2}`)
    .join(' ');

  return (
    <div className={s.stage}>
      <div className={m.frame}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className={m.board}
          role="application"
          aria-label={`лабиринт до ${assetLabel(params.goalAsset)}`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            move(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 0) return;
            move(e.clientX, e.clientY);
          }}
        >
          <path className={m.trail} d={trail} />
          <path className={m.walls} d={walls.join(' ')} strokeWidth={WALL} />
        </svg>

        {/* Целта и пътникът стоят НАД мрежата, за да са ясно видими. */}
        <span
          className={m.goal}
          style={{
            left: `${((maze.goal.x + 0.5) / maze.cols) * 100}%`,
            top: `${((maze.goal.y + 0.5) / maze.rows) * 100}%`,
          }}
        >
          <Asset id={params.goalAsset} size="100%" label={assetLabel(params.goalAsset)} />
        </span>

        <span
          className={m.traveller}
          style={{
            left: `${((here.x + 0.5) / maze.cols) * 100}%`,
            top: `${((here.y + 0.5) / maze.rows) * 100}%`,
          }}
        >
          <Asset id={params.travellerAsset} size="100%" />
        </span>
      </div>
    </div>
  );
}
