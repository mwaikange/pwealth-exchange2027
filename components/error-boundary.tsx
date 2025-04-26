"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ error, errorInfo })
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    // Force a refresh of the page
    window.location.reload()
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 bg-gray-50 rounded-lg shadow-sm">
            <div className="flex flex-col items-center text-center max-w-md">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
              <p className="text-gray-600 mb-6">
                We're having trouble connecting to our servers. This could be due to network issues or server
                maintenance.
              </p>
              <div className="space-y-4 w-full">
                <Button onClick={this.handleRetry} className="w-full flex items-center justify-center">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry Connection
                </Button>
                <div className="text-sm text-gray-500">
                  If the problem persists, please try again later or contact support.
                </div>
              </div>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
