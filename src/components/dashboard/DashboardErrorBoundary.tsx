import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class DashboardErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Dashboard]', error, info.componentStack);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, message: '' });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="status-banner-error flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} />
            <div>
              <p className="font-medium">Erreur d&apos;affichage du tableau de bord</p>
              <p className="mt-1 text-sm opacity-90">{this.state.message}</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={this.handleRetry}>
            Réessayer
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
