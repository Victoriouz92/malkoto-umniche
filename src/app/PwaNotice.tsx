import { useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/design-system';
import { applyAvailableUpdate, getPwaStatus, getServerPwaStatus, watchPwa } from '@/core/pwa';

export function PwaNotice() {
  const state = useSyncExternalStore(watchPwa, getPwaStatus, getServerPwaStatus);
  const { pathname } = useLocation();
  if (!state.updateAvailable || pathname.startsWith('/play/')) return null;
  return (
    <aside className="update-notice" aria-label="Нова версия">
      <p>Нова версия на игрите е готова. Напредъкът ви се запазва.</p>
      <Button variant="primary" size="sm" onClick={applyAvailableUpdate}>
        Обнови сега
      </Button>
    </aside>
  );
}
