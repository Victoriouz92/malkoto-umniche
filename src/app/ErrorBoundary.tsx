import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button, Page, Stack } from '@/design-system';
import { t } from '@/i18n';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Последната преграда преди бял екран.
 *
 * Детето не бива да вижда стек трейс, а родителят не бива да остава без
 * изход. Показваме спокоен екран с един бутон „назад".
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Малкото Умниче] Необработена грешка:', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <Page narrow>
        <Stack gap={6} center>
          <h1>{t('sys.error.title')}</h1>
          <p>{t('sys.error.body')}</p>
          <Button
            variant="primary"
            size="kid"
            onClick={() => {
              this.setState({ error: null });
              window.history.back();
            }}
          >
            {t('action.back')}
          </Button>
        </Stack>
      </Page>
    );
  }
}
