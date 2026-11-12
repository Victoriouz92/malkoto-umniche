import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Cluster, Page, Stack, cx } from '@/design-system';
import { useApp } from '@/core/store/app';
import { t } from '@/i18n';
import { PinGate } from './PinGate';
import { ProfilesTab } from './tabs/ProfilesTab';
import { LimitsTab } from './tabs/LimitsTab';
import { ContentTab } from './tabs/ContentTab';
import { StatsTab } from './tabs/StatsTab';
import { SettingsTab } from './tabs/SettingsTab';
import { VoiceTab } from './tabs/VoiceTab';
import s from './parent.module.css';
import { PageArtwork } from '@/artwork/PageArtwork';

type TabId = 'profiles' | 'limits' | 'content' | 'stats' | 'voice' | 'settings';

const TABS: { id: TabId; labelKey: Parameters<typeof t>[0] }[] = [
  { id: 'profiles', labelKey: 'parent.tab.profiles' },
  { id: 'limits', labelKey: 'parent.tab.limits' },
  { id: 'content', labelKey: 'parent.tab.content' },
  { id: 'stats', labelKey: 'parent.tab.stats' },
  { id: 'voice', labelKey: 'parent.tab.voice' },
  { id: 'settings', labelKey: 'parent.tab.settings' },
];

/**
 * Родителският панел.
 *
 * Заключен зад PIN. Отключването живее в паметта на компонента и се губи
 * при напускане на екрана — нарочно: излизането обратно към детето трябва
 * да затваря вратата след себе си.
 *
 * Подравняването тук е ЛЯВО, не центрирано като в детския режим. Плътни
 * настройки и числа се сканират по левия ръб (правило 9а).
 */
export function ParentHome() {
  const navigate = useNavigate();
  const profiles = useApp((st) => st.profiles);
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<TabId>(profiles.length === 0 ? 'profiles' : 'stats');

  if (!unlocked) {
    return <PinGate onUnlocked={() => setUnlocked(true)} onCancel={() => void navigate('/')} />;
  }

  return (
    <Page narrow className={s.shell}>
      <Stack gap={4}>
        <Cluster between>
          <h1>{t('parent.title')}</h1>
          <Button variant="quiet" size="sm" onClick={() => void navigate(profiles.length ? '/kid' : '/')}>
            {t('parent.exit')}
          </Button>
        </Cluster>

        <div className={s.tabs} role="tablist" aria-label={t('parent.title')}>
          {TABS.map(({ id, labelKey }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`parent-tab-${id}`}
              aria-controls="parent-panel"
              aria-selected={tab === id}
              tabIndex={tab === id ? 0 : -1}
              className={cx(s.tab, tab === id && s.tabOn)}
              onClick={() => setTab(id)}
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const index = TABS.findIndex((item) => item.id === id);
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? TABS.length - 1
                      : (index + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) %
                        TABS.length;
                const target = TABS[next];
                if (target) {
                  setTab(target.id);
                  document.getElementById(`parent-tab-${target.id}`)?.focus();
                }
              }}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        <div role="tabpanel" id="parent-panel" aria-labelledby={`parent-tab-${tab}`}>
          <PageArtwork scene={`parent-${tab}`} className={s.tabScene} />
          {tab === 'profiles' ? <ProfilesTab /> : null}
          {tab === 'limits' ? <LimitsTab /> : null}
          {tab === 'content' ? <ContentTab /> : null}
          {tab === 'stats' ? <StatsTab /> : null}
          {tab === 'voice' ? <VoiceTab /> : null}
          {tab === 'settings' ? <SettingsTab /> : null}
        </div>
      </Stack>
    </Page>
  );
}
