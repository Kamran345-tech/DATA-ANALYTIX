import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in UI component tree:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleDismiss = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0F17] text-[#dfe2ee] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#111827] border border-[#374151] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 text-[#EF4444] flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#00F5A0] bg-[#00F5A0]/10 px-2 py-0.5 rounded">
                  Self-Healing Engine
                </span>
                <span className="text-xs text-slate-400">Error Intercepted</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Something encountered an issue, but your session is safe
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                The analytical platform intercepted the error without terminating your session. You can reload or reset your active filters.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-[#0B0F17] border border-[#1F2937] p-3 rounded-lg text-xs font-mono text-red-300 overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00F5A0] text-[#003921] font-bold text-xs hover:bg-[#00e293] transition-all shadow-md shadow-[#00F5A0]/20"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Platform</span>
              </button>
              <button
                onClick={this.handleDismiss}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#172033] text-slate-200 hover:text-white font-semibold text-xs border border-[#374151] hover:border-[#00F5A0]/50 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Return to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
