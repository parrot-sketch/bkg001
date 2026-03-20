'use client';

import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="text-center space-y-4 max-w-md">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              Something went wrong
            </h2>
            <p className="text-sm text-slate-500">
              An unexpected error occurred while loading this page. Please try again.
            </p>
            {this.state.error && process.env.NODE_ENV === 'development' && (
              <pre className="mt-4 p-3 bg-slate-100 rounded-lg text-left text-xs text-slate-600 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="pt-2">
              <Button
                onClick={this.handleReset}
                className="bg-slate-900 hover:bg-slate-800 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface ErrorStateProps {
  error: Error;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <div className="p-3 rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-slate-900">
          Failed to load data
        </h2>
        <p className="text-sm text-slate-500">
          {error.message || 'An unexpected error occurred'}
        </p>
        {onRetry && (
          <div className="pt-2">
            <Button
              onClick={onRetry}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
