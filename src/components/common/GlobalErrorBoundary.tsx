import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string; stack?: string }

export class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message, stack: error.stack };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[GlobalErrorBoundary]', error, info.componentStack);
  }

  private reset = () => this.setState({ hasError: false, message: '', stack: undefined });

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">Une erreur inattendue s'est produite</h1>
            <p className="text-sm text-muted-foreground">{this.state.message || 'Erreur inconnue'}</p>
          </div>
          <Button onClick={this.reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
          {import.meta.env.DEV && this.state.stack && (
            <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-slate-900 p-4 text-left text-[10px] text-slate-300">
              {this.state.stack}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
