'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, Home, FileText } from 'lucide-react';

// Error boundary component for React error handling
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service (if available)
    this.logError(error, errorInfo);
  }

  componentWillUnmount() {
    // Clean up retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // In a real application, send to error tracking service
    console.error('Error Report:', errorReport);
    
    // Store in local storage for debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('errorLogs') || '[]');
      existingErrors.push(errorReport);
      localStorage.setItem('errorLogs', JSON.stringify(existingErrors.slice(-10))); // Keep last 10 errors
    } catch (e) {
      console.warn('Failed to store error log:', e);
    }
  };

  private handleRetry = () => {
    if (this.state.retryCount >= 3) {
      return; // Max retries reached
    }

    this.setState({
      isRetrying: true,
      retryCount: this.state.retryCount + 1
    });

    const timeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false
      });
    }, 1000);

    this.retryTimeouts.push(timeout);
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private getErrorSeverity = (error: Error): 'low' | 'medium' | 'high' | 'critical' => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'medium';
    }
    if (message.includes('chunk') || message.includes('loading')) {
      return 'low';
    }
    if (message.includes('memory') || message.includes('quota')) {
      return 'high';
    }
    if (message.includes('security') || message.includes('permission')) {
      return 'critical';
    }
    
    return 'medium';
  };

  private getErrorSuggestions = (error: Error): string[] => {
    const message = error.message.toLowerCase();
    const suggestions: string[] = [];

    if (message.includes('network') || message.includes('fetch')) {
      suggestions.push('Check your internet connection');
      suggestions.push('Try refreshing the page');
      suggestions.push('Contact support if the problem persists');
    } else if (message.includes('chunk') || message.includes('loading')) {
      suggestions.push('Clear your browser cache');
      suggestions.push('Try refreshing the page');
      suggestions.push('Update your browser to the latest version');
    } else if (message.includes('memory') || message.includes('quota')) {
      suggestions.push('Close other browser tabs');
      suggestions.push('Clear browser data');
      suggestions.push('Try using an incognito/private window');
    } else {
      suggestions.push('Try refreshing the page');
      suggestions.push('Clear your browser cache');
      suggestions.push('Contact support with the error details');
    }

    return suggestions;
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const severity = this.getErrorSeverity(this.state.error);
      const suggestions = this.getErrorSuggestions(this.state.error);
      const canRetry = this.state.retryCount < 3;

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
            {/* Error Icon and Title */}
            <div className="text-center mb-6">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                severity === 'critical' ? 'bg-red-100 text-red-600' :
                severity === 'high' ? 'bg-orange-100 text-orange-600' :
                severity === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                <AlertTriangle className="w-8 h-8" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {severity === 'critical' ? 'Critical Error' :
                 severity === 'high' ? 'System Error' :
                 severity === 'medium' ? 'Application Error' :
                 'Minor Error'}
              </h1>
              
              <p className="text-gray-600">
                {severity === 'critical' ? 'A critical error has occurred that requires immediate attention.' :
                 severity === 'high' ? 'A system error has occurred that may affect functionality.' :
                 severity === 'medium' ? 'An application error has occurred. You can try to continue.' :
                 'A minor error occurred. The application should continue to work normally.'}
              </p>
            </div>

            {/* Error Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                <Bug className="w-4 h-4 mr-2" />
                Error Details
              </h3>
              <p className="text-sm text-gray-700 font-mono bg-white p-3 rounded border">
                {this.state.error.message}
              </p>
              
              {this.props.showDetails && this.state.error.stack && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                    Technical Details
                  </summary>
                  <pre className="mt-2 text-xs text-gray-600 bg-white p-3 rounded border overflow-x-auto">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>

            {/* Suggestions */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">What you can try:</h3>
              <ul className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 justify-center">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  disabled={this.state.isRetrying}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {this.state.isRetrying ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry ({3 - this.state.retryCount} left)
                    </>
                  )}
                </button>
              )}
              
              <button
                onClick={this.handleReload}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </button>
            </div>

            {/* Error ID for Support */}
            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500">
                Error ID: {Date.now().toString(36).toUpperCase()}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Please include this ID when contacting support
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
}

// Loading error component for async operations
export const LoadingError: React.FC<LoadingErrorProps> = ({
  error,
  onRetry,
  retryCount = 0,
  maxRetries = 3,
  className = ''
}) => {
  const canRetry = retryCount < maxRetries;
  
  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 mb-1">
            Loading Failed
          </h3>
          <p className="text-sm text-red-700 mb-3">
            {error || 'An error occurred while loading data.'}
          </p>
          {canRetry && onRetry && (
            <button
              onClick={onRetry}
              className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors"
            >
              Retry ({maxRetries - retryCount} left)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface LoadingErrorProps {
  error: string;
  onRetry?: () => void;
  retryCount?: number;
  maxRetries?: number;
  className?: string;
}

// Network error component
export const NetworkError: React.FC<NetworkErrorProps> = ({
  onRetry,
  className = ''
}) => {
  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 mb-1">
            Connection Issue
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            Unable to connect to the server. Please check your internet connection.
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface NetworkErrorProps {
  onRetry?: () => void;
  className?: string;
}

// Progress indicator with error handling
export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  total,
  operation,
  error,
  onCancel,
  onRetry,
  className = ''
}) => {
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;
  const isComplete = progress >= total;
  const hasError = !!error;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">
          {operation}
        </span>
        <span className="text-sm text-gray-500">
          {progress} / {total}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            hasError ? 'bg-red-500' : 
            isComplete ? 'bg-green-500' : 
            'bg-blue-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {hasError && (
        <div className="mb-3">
          <p className="text-sm text-red-600 mb-2">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors mr-2"
            >
              Retry
            </button>
          )}
        </div>
      )}
      
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>
          {hasError ? 'Failed' : 
           isComplete ? 'Complete' : 
           `${percentage}% complete`}
        </span>
        {onCancel && !isComplete && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

interface ProgressIndicatorProps {
  progress: number;
  total: number;
  operation: string;
  error?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
}

// Toast notification for errors
export const ErrorToast: React.FC<ErrorToastProps> = ({
  message,
  type = 'error',
  onClose,
  autoClose = true,
  duration = 5000
}) => {
  React.useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose, duration]);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  return (
    <div className={`fixed top-4 right-4 max-w-sm w-full border rounded-lg p-4 shadow-lg z-50 ${getTypeStyles()}`}>
      <div className="flex items-start">
        <AlertTriangle className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-3 text-gray-400 hover:text-gray-600 transition-colors"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

interface ErrorToastProps {
  message: string;
  type?: 'error' | 'warning' | 'success' | 'info';
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

// Error fallback component for suspense boundaries
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  className = ''
}) => {
  return (
    <div className={`text-center py-8 ${className}`}>
      <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        Something went wrong
      </h2>
      <p className="text-gray-600 mb-4">
        {error?.message || 'An unexpected error occurred'}
      </p>
      {resetErrorBoundary && (
        <button
          onClick={resetErrorBoundary}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
};

interface ErrorFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
  className?: string;
}

export default ErrorBoundary; 