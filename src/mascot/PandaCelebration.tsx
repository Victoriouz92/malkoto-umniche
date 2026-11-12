import s from './panda.module.css';

/** A short, silent dance; continuing never depends on the animation finishing. */
export function PandaCelebration({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`${s.celebration} ${small ? s.small : ''}`}
      aria-hidden="true"
      data-panda-dance
    >
      <span className={s.dancer}>
        <span className={`${s.sprite} ${s.dance}`} />
      </span>
      <span className={s.sparkle}>✦</span>
      <span className={s.sparkle}>✧</span>
    </span>
  );
}
