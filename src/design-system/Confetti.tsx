import { useEffect, useRef } from 'react';
import s from './Confetti.module.css';

type Props = {
  /** Стартира изстрел при всяка промяна на стойността (обикновено брояч). */
  trigger: number;
  /** Откъде излита. По подразбиране центърът на екрана. 0–1 в двете оси. */
  origin?: { x: number; y: number };
  count?: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  color: string;
  life: number;
};

const PALETTE = [
  '--cat-puzzles-accent',
  '--cat-memory-accent',
  '--cat-numbers-accent',
  '--cat-letters-accent',
  '--cat-colors-accent',
  '--cat-shapes-accent',
  '--cat-food-accent',
];

/**
 * Празнуване.
 *
 * Canvas, а не DOM: сто частици като елементи забиват слабите таблети,
 * а точно там продуктът трябва да върви гладко.
 *
 * При prefers-reduced-motion не рисува нищо — извикващият компонент
 * трябва да покаже статична алтернатива (стикер, усмивка).
 */
export function Confetti({ trigger, origin = { x: 0.5, y: 0.45 }, count = 70 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (trigger === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Цветовете идват от токените. Ако нито един не се разреши, значи
    // темата е счупена — тогава не рисуваме нищо, вместо да измисляме
    // цвят, който няма да пасне на нищо на екрана.
    const styles = getComputedStyle(document.documentElement);
    const colors = PALETTE.map((v) => styles.getPropertyValue(v).trim()).filter(Boolean);
    if (colors.length === 0) return;

    const ox = origin.x * w;
    const oy = origin.y * h;

    const particles: Particle[] = Array.from({ length: count }, () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const speed = 5 + Math.random() * 8;
      return {
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        size: 6 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)] ?? colors[0]!,
        life: 1,
      };
    });

    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 16.67, 3);
      last = now;
      ctx.clearRect(0, 0, w, h);

      let alive = false;
      for (const p of particles) {
        p.vy += 0.32 * dt;
        p.vx *= 0.99;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.life -= 0.008 * dt;

        if (p.life <= 0 || p.y > h + 40) continue;
        alive = true;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }

      if (alive) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [trigger, origin.x, origin.y, count]);

  return <canvas ref={canvasRef} aria-hidden="true" className={s.canvas} />;
}
