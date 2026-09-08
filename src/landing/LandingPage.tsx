import { useNavigate } from 'react-router-dom';

import { activeProfile, useApp } from '@/core/store/app';
import { t } from '@/i18n';
import s from './landing.module.css';

const CATEGORIES = [
  ['🧩', 'Пъзели'],
  ['🎨', 'Цветове'],
  ['△○□', 'Форми'],
  ['123', 'Числа'],
  ['АБВ', 'Букви'],
  ['🐻', 'Животни'],
] as const;

export function LandingPage() {
  const navigate = useNavigate();
  const profile = useApp(activeProfile);
  const start = () => navigate(profile ? '/kid' : '/parent');
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <main className={s.page}>
      <header className={s.header}>
        <button className={s.brand} type="button" onClick={() => navigate('/')}>
          <span className={s.brandMark} aria-hidden="true">
            <img src="/icons/icon-192.png" alt="" />
          </span>
          <span>{t('app.name')}</span>
        </button>
        <nav className={s.nav} aria-label="Основна навигация">
          <button className={s.navLink} type="button" onClick={() => scrollTo('games')}>Игри</button>
          <button className={s.navLink} type="button" onClick={() => scrollTo('parents')}>За родители</button>
          <button className={s.navLink} type="button" onClick={() => scrollTo('support')}>Подкрепи ни</button>
          <button className={s.loginButton} type="button" onClick={() => navigate('/parent')}>Вход</button>
        </nav>
      </header>

      <section className={s.hero}>
        <img src="/hero-malkoto-umniche.png" alt="Весела червена панда играе с пъзел и форми" />
        <div className={s.heroCopy}>
          <span className={s.eyebrow}>За деца от 2 до 6 години</span>
          <h1>Малки игри.<br /><em>Големи открития.</em></h1>
          <p>Забавни образователни игри на български, които растат заедно с детето.</p>
          <div className={s.heroActions}>
            <button className={s.primary} type="button" onClick={start}>
              {profile ? `Продължи като ${profile.name}` : 'Започнете безплатно'}
            </button>
            <button className={s.howButton} type="button" onClick={() => scrollTo('parents')}>Как работи?</button>
          </div>
          <div className={s.trust}>Без реклами <span>•</span> Без абонамент <span>•</span> Работи офлайн</div>
        </div>
      </section>

      <section className={s.section} id="games">
        <div className={s.slideVisual}>
          <img src="/slide-numbers-wide.png" alt="Горски животни край водопад с цветни числа" />
        </div>
        <div className={s.slideContent}>
          <span className={s.kicker}>Избираме, играем, учим</span>
          <h2>По нещо любимо за всяко малко умниче</h2>
          <p className={s.lead}>Игрите се подбират автоматично според възрастта на детето.</p>
          <div className={s.categoryGrid}>
            {CATEGORIES.map(([icon, label], index) => (
              <button key={label} type="button" onClick={start} className={s.category} data-tone={index % 3}>
                <span aria-hidden="true">{icon}</span>
                <strong>{label}</strong>
              </button>
            ))}
          </div>
          <button className={s.textButton} type="button" onClick={start}>Вижте всички категории →</button>
        </div>
      </section>

      <section className={s.parents} id="parents">
        <div className={s.parentVisual}>
          <img src="/slide-reading-wide.png" alt="Горски приятели четат книга заедно" />
        </div>
        <div className={s.parentContent}>
          <div>
            <span className={s.kicker}>Спокойствие за родителя</span>
            <h2>Развитие без натиск и без излишен екранен шум</h2>
          </div>
          <div className={s.benefits}>
            <article><span>🌱</span><h3>Расте с детето</h3><p>Съдържанието се филтрира по възраст, а следващото ниво се отключва от родител.</p></article>
            <article><span>🔒</span><h3>Данните остават у дома</h3><p>Профилите, прогресът и записаният родителски глас се пазят само на устройството.</p></article>
            <article><span>☀️</span><h3>Спокойно време за игра</h3><p>Без реклами, класации и покупки. Родителят определя времето за игра.</p></article>
          </div>
        </div>
      </section>

      <section className={s.support} id="support">
        <div className={s.supportCopy}>
          <span className={s.kicker}>Проект с кауза</span>
          <h2>Помогнете ни да създаваме още безплатни игри на български</h2>
          <p>„Малкото Умниче“ няма платени нива. Скоро тук ще добавим доброволен начин за подкрепа на развитието.</p>
        </div>
        <div className={s.supportVisual}>
          <img src="/slide-letters-wide.png" alt="Горски животни играят с големи цветни букви" />
        </div>
      </section>

      <footer className={s.footer}>
        <div className={s.footerBrand}>
          <img src="/icons/icon-192.png" alt="" aria-hidden="true" />
          <div>
            <strong>{t('app.name')}</strong>
            <span>Създадено с грижа за малките откриватели в България.</span>
          </div>
        </div>
        <button type="button" onClick={() => navigate('/parent')}>Родителски вход</button>
      </footer>
    </main>
  );
}
