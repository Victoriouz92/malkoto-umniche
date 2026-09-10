import { useEffect, useRef, useState } from 'react';
import { Asset } from '@/assets/Asset';
import { Button } from '@/design-system';
import type { EngineProps } from '../types';
import {
  DIRECTIONS,
  routeSolution,
  runRoute,
  type Direction,
  type RouteProgramParams,
} from './schema';
import shared from '../shared/engine.module.css';
import s from './Engine.module.css';

const ARROW: Record<Direction, string> = { up: '↑', right: '→', down: '↓', left: '←' };
const LABEL: Record<Direction, string> = {
  up: 'Нагоре',
  right: 'Надясно',
  down: 'Надолу',
  left: 'Наляво',
};

export function RouteProgramEngine({
  params,
  api,
  onComplete,
  onProgress,
}: EngineProps<RouteProgramParams>) {
  const [missionIndex, setMissionIndex] = useState(0);
  const mission = params.missions[missionIndex]!;
  const [commands, setCommands] = useState<Direction[]>([]);
  const [playback, setPlayback] = useState<ReturnType<typeof runRoute> | null>(null);
  const [frame, setFrame] = useState(0);
  const [running, setRunning] = useState(false);
  const [solved, setSolved] = useState(false);
  const [message, setMessage] = useState('Подреди стрелките. После натисни „Пусни влакчето“.');
  const [hint, setHint] = useState<Direction[] | null>(null);
  const attempts = useRef(0);
  const hints = useRef(0);
  const started = useRef(Date.now());
  const finished = useRef(false);

  useEffect(
    () => onProgress(missionIndex / params.missions.length),
    [missionIndex, params.missions.length, onProgress],
  );
  useEffect(() => {
    if (!running || !playback) return;
    const timer = setTimeout(() => {
      if (frame < playback.trace.length - 1) {
        setFrame((v) => v + 1);
        return;
      }
      setRunning(false);
      setSolved(playback.success);
      if (playback.success) {
        api.sfx('correct');
        setMessage('Влакчето пристигна! Маршрутът ти работи.');
      } else {
        api.sfx('soften');
        setMessage(
          playback.blockedAt >= 0
            ? `На стъпка ${playback.blockedAt + 1} няма път. Промени стрелката и опитай пак.`
            : 'Още не сме изпълнили маршрута. Провери гарата и междинната спирка.',
        );
      }
    }, 650);
    return () => clearTimeout(timer);
  }, [running, playback, frame, api]);

  const cell = playback?.trace[frame] ?? mission.start;
  const edit = (next: Direction[]) => {
    setCommands(next);
    setPlayback(null);
    setFrame(0);
    setMessage('Провери стрелките и пусни влакчето.');
  };
  const nextMission = () => {
    if (!solved || finished.current) return;
    if (missionIndex + 1 === params.missions.length) {
      finished.current = true;
      onProgress(1);
      api.celebrate();
      api.sfx('complete');
      onComplete({
        completed: true,
        durationMs: Date.now() - started.current,
        correct: params.missions.length,
        attempts: attempts.current,
        hintsUsed: hints.current,
      });
    } else {
      setMissionIndex((v) => v + 1);
      setCommands([]);
      setPlayback(null);
      setFrame(0);
      setSolved(false);
      setHint(null);
      setMessage('Нова гара! Подреди маршрут за влакчето.');
    }
  };

  return (
    <div className={`${shared.stage} ${s.stage}`}>
      <p className={s.heading}>
        Маршрут {missionIndex + 1} от {params.missions.length}
      </p>
      <p className={s.legend}>
        🚂 Начало · ⚑ Гара · ▧ Препятствие
        {mission.stop !== undefined ? ' · ★ Мини първо през звездата' : ''}
      </p>
      <div
        className={s.board}
        style={{ gridTemplateColumns: `repeat(${mission.size}, 1fr)` }}
        role="img"
        aria-label={`Карта ${mission.size} на ${mission.size}. Влакче: ред ${Math.floor(cell / mission.size) + 1}, колона ${(cell % mission.size) + 1}.`}
      >
        {Array.from({ length: mission.size ** 2 }, (_, i) => (
          <div
            key={i}
            className={s.cell}
            data-blocked={mission.blocks.includes(i)}
            data-current={cell === i}
          >
            {cell === i ? (
              <Asset id="vehicle.train" size="85%" />
            ) : mission.blocks.includes(i) ? (
              '▧'
            ) : i === mission.goal ? (
              '⚑'
            ) : i === mission.stop ? (
              '★'
            ) : playback?.trace.slice(0, frame).includes(i) ? (
              '·'
            ) : (
              ''
            )}
          </div>
        ))}
      </div>
      <details className={s.mapText}>
        <summary>Карта с думи</summary>
        {Array.from({ length: mission.size }, (_, row) => (
          <p key={row}>
            Ред {row + 1}:{' '}
            {Array.from({ length: mission.size }, (_, col) => {
              const i = row * mission.size + col;
              return `${col + 1} — ${i === mission.start ? 'начало' : i === mission.goal ? 'гара' : i === mission.stop ? 'звезда' : mission.blocks.includes(i) ? 'препятствие' : 'свободно'}`;
            }).join('; ')}
          </p>
        ))}
      </details>
      <div className={s.commands} aria-label="Твоите команди">
        {!commands.length && <span>Стрелките ще се подредят тук.</span>}
        {commands.map((dir, i) => (
          <button
            key={i}
            type="button"
            disabled={running || solved}
            data-active={running && frame === i + 1}
            aria-label={`Стъпка ${i + 1}: ${LABEL[dir]}. Натисни за премахване.`}
            onClick={() => edit(commands.filter((_, index) => i !== index))}
          >
            <small>{i + 1}</small>
            {ARROW[dir]}
          </button>
        ))}
      </div>
      <div className={s.controls}>
        {DIRECTIONS.map((dir) => (
          <button
            key={dir}
            type="button"
            aria-label={LABEL[dir]}
            disabled={running || solved || commands.length >= params.maxCommands}
            onClick={() => {
              edit([...commands, dir]);
              api.sfx('pick');
            }}
          >
            {ARROW[dir]}
          </button>
        ))}
      </div>
      <p className={s.message} role="status">
        {message}
      </p>
      <div className={s.actions}>
        <Button
          disabled={running || solved || !commands.length}
          onClick={() => {
            attempts.current++;
            setPlayback(runRoute(mission, commands));
            setFrame(0);
            setRunning(true);
            setMessage('Следваме твоите стрелки…');
          }}
        >
          Пусни влакчето
        </Button>
        <Button
          variant="quiet"
          disabled={running || solved || !commands.length}
          onClick={() => edit(commands.slice(0, -1))}
        >
          Върни стрелка
        </Button>
        <Button
          variant="quiet"
          disabled={running || solved}
          onClick={() => {
            if (!hint) hints.current++;
            setHint(routeSolution(mission));
          }}
        >
          Покажи пример
        </Button>
      </div>
      {commands.length >= params.maxCommands && !solved && (
        <p>До {params.maxCommands} стрелки. Махни излишна стрелка, за да добавиш друга.</p>
      )}
      {hint && (
        <p
          className={s.hint}
          aria-label={`Пример: ${hint.map((dir) => LABEL[dir]).join(', ')}`}
        >
          Пример: {hint.map((dir) => ARROW[dir]).join(' ')}
        </p>
      )}
      {solved && (
        <Button variant="primary" onClick={nextMission}>
          {missionIndex + 1 === params.missions.length ? 'Готово!' : 'Към следващата гара'}
        </Button>
      )}
    </div>
  );
}
