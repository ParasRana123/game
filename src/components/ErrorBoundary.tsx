import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
  onExit?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected rendering error occurred.',
    };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught component error:', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
    this.props.onReset?.();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-950 rounded-xl border border-rose-500/40 p-6">
          <div className="max-w-md text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>
            <h2 className="font-arcade text-2xl font-bold text-white">ARENA RENDER ERROR</h2>
            <p className="text-xs text-slate-400 break-words">{this.state.errorMessage}</p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-arcade text-sm font-bold cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> RETRY ARENA
              </button>
              {this.props.onExit && (
                <button
                  onClick={this.props.onExit}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 font-arcade text-sm font-bold cursor-pointer"
                >
                  <Home className="w-4 h-4" /> MAIN MENU
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
