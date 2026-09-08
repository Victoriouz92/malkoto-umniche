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
    return <PinGate onUnlocked={() => setUnlocked(true)} onCancel={() => navigate('/')} />;
  }

  return (
    <Page narrow className={s.shell}>
      <Stack gap={4}>
        <Cluster between>
          <h1>{t('parent.title')}</h1>
          <Button variant="quiet" size="sm" onClick={() => navigate('/')}>
            {t('parent.exit')}
          </Button>
        </Cluster>

        <div className={s.tabs} role="tablist" aria-label={t('parent.title')}>
          {TABS.map(({ id, labelKey }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={cx(s.tab, tab === id && s.tabOn)}
              onClick={() => setTab(id)}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        <div role="tabpanel">
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
