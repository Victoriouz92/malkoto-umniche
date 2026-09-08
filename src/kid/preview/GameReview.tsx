import { lazy, Suspense, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { activityById } from '@/content/registry';
import { schemaFor } from '@/engines/schemas';
import { engineModule } from '@/engines/registry';
import type { EngineApi, ActivityResult } from '@/engines/types';
import { Button, Page, Stack } from '@/design-system';
import { t } from '@/i18n';
import '@/engines/shared/playful.css';

const silentApi: EngineApi = { ageBand: 'preschool', noFail: true,
  sfx: () => {}, haptic: () => {}, celebrate: () => {}, speak: () => {}, announce: () => {} };

/** Development-only isolated review: never updates child profiles or screen time. */
export function GameReview() {
  const { activityId } = useParams<{ activityId: string }>();
  return <Review key={activityId} id={activityId ?? ''} />;
}
function Review({ id }: { id: string }) {
  const navigate = useNavigate();
  const activity = activityById(id);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ActivityResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  const Component = useMemo(() => {
    const module = activity && engineModule(activity.engine);
    return module ? lazy(() => module.load().then(defaultExport => ({ default: defaultExport }))) : null;
  }, [activity]);
  const params = useMemo(() => activity && schemaFor(activity.engine)?.paramsSchema.parse(activity.params), [activity]);
  if (!activity || !Component) return <Page>Няма такава игра.</Page>;
  return <Page centered><Stack gap={4}>
    <p style={{ fontSize: '.8rem', color: 'var(--c-ink-soft)' }}>Преглед за разработка · не записва детски прогрес</p>
    <h1 style={{ fontSize: '1.3rem' }}>{t(activity.titleKey as never)}</h1>
    <progress aria-label="Напредък" value={result ? 1 : progress} max={1} style={{ width: '100%' }} />
    {result ? <Stack center><h2>Готово!</h2><p>Завършени задачи: {result.correct}</p>
      <Button onClick={() => { setResult(null); setProgress(0); setAttempt(a => a + 1); }}>Играй пак</Button></Stack>
      : <Suspense fallback={<p>Момент…</p>}><div className="playful-game"><Component key={attempt} activity={activity} params={params as never}
        variant={0} api={silentApi} onComplete={setResult} onProgress={setProgress} /></div></Suspense>}
    <Button variant="quiet" onClick={() => navigate(`/c/${activity.category}`)}>Обратно към категорията</Button>
  </Stack></Page>;
}
