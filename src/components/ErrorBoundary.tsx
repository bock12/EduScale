import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      let details = "";

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) {
            errorMessage = "Database Access Denied";
            details = `Operation: ${parsed.operationType} on ${parsed.path}. Please check your permissions.`;
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white p-8 rounded-[32px] border border-[#e5e5e5] shadow-xl text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">{errorMessage}</h2>
            <p className="text-[#9e9e9e] mb-8">{details || "The application encountered a problem. Our team has been notified."}</p>
            
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] text-white font-bold py-4 rounded-2xl hover:bg-black transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function handleReset() {
  window.location.reload();
}
