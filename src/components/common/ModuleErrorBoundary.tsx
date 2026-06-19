import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ModuleErrorBoundaryProps {
  children: ReactNode;
  moduleName?: string;
}

interface ModuleErrorBoundaryState {
  error: Error | null;
}

export class ModuleErrorBoundary extends Component<ModuleErrorBoundaryProps, ModuleErrorBoundaryState> {
  state: ModuleErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ModuleErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ModuleErrorBoundary', this.props.moduleName ?? 'module', error, info.componentStack);
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="rounded-2xl border p-6 text-sm shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Module temporairement indisponible</h2>
        <p className="mt-2 text-muted-foreground">
          Une erreur a été interceptée dans {this.props.moduleName ?? 'ce module'}. Le reste de
          l'application reste accessible.
        </p>
        <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-background p-3 text-xs text-muted-foreground">
          {this.state.error.message}
        </pre>
        <button
          type="button"
          onClick={this.handleRetry}
          className="mt-4 inline-flex items-center rounded-lg border px-3 py-2 font-medium hover:bg-muted"
        >
          Réessayer
        </button>
      </div>
    );
  }
}
