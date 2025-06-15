import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: React.ComponentType<any>
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorId: string
}

export class SmartErrorBoundary extends Component<Props, State> {
  private retryCount = 0
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      errorId: this.generateErrorId(),
    }
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo)

    // Report error to monitoring service
    this.reportError(error, errorInfo)

    // Attempt automatic recovery for certain error types
    this.attemptRecovery(error)
  }

  private reportError(error: Error, errorInfo: ErrorInfo) {
    const errorReport = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      props: this.props,
      retryCount: this.retryCount,
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.group('🚨 Error Boundary Triggered')
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.error('Full Report:', errorReport)
      console.groupEnd()
    }

    // Send to error tracking service in production
    if (import.meta.env.PROD) {
      // TODO: Send to error tracking service
      // analytics.track('error_boundary_triggered', errorReport)
    }
  }

  private attemptRecovery(error: Error) {
    // Auto-recovery for certain error types
    if (this.shouldAttemptAutoRecovery(error) && this.retryCount < this.maxRetries) {
      this.retryCount++
      
      setTimeout(() => {
        this.handleRetry()
      }, 1000 * this.retryCount) // Exponential backoff
    }
  }

  private shouldAttemptAutoRecovery(error: Error): boolean {
    const recoverableErrors = [
      'Loading chunk',
      'ChunkLoadError',
      'Network Error',
      'Failed to fetch',
    ]

    return recoverableErrors.some(errorType => 
      error.message.includes(errorType) || error.name.includes(errorType)
    )
  }

  private handleRetry = () => {
    // Clear error state to retry
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: this.generateErrorId(),
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private handleReportIssue = () => {
    const subject = encodeURIComponent(`Error Report: ${this.state.error?.message || 'Unknown Error'}`)
    const body = encodeURIComponent(`
Error ID: ${this.state.errorId}
Error Message: ${this.state.error?.message || 'Unknown Error'}
Stack Trace: ${this.state.error?.stack || 'No stack trace available'}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
Timestamp: ${new Date().toISOString()}

Please describe what you were doing when this error occurred:
[Your description here]
    `)
    
    window.open(`mailto:support@example.com?subject=${subject}&body=${body}`)
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return (
          <FallbackComponent 
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            onRetry={this.handleRetry}
          />
        )
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow-soft sm:rounded-soft sm:px-10">
              <div className="text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Oops! Something went wrong
                </h1>
                <p className="text-sm text-gray-600 mb-6">
                  We're sorry for the inconvenience. Our team has been notified about this issue.
                </p>
                
                {import.meta.env.DEV && this.state.error && (
                  <div className="bg-red-50 border border-red-200 rounded-medium p-4 mb-6 text-left">
                    <h3 className="font-medium text-red-800 mb-2">Error Details (Development)</h3>
                    <p className="text-sm text-red-700 font-mono break-all">
                      {this.state.error.message}
                    </p>
                    <details className="mt-2">
                      <summary className="text-sm text-red-600 cursor-pointer">
                        Stack Trace
                      </summary>
                      <pre className="text-xs text-red-600 mt-2 whitespace-pre-wrap">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={this.handleRetry}
                    className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-medium shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </button>
                  
                  <button
                    onClick={this.handleGoHome}
                    className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-medium shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </button>
                  
                  <button
                    onClick={this.handleReload}
                    className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-medium shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reload Page
                  </button>
                  
                  <button
                    onClick={this.handleReportIssue}
                    className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-medium shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Report Issue
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-6">
                  Error ID: {this.state.errorId}
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
} 