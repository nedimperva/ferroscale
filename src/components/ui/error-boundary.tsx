"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const isDev = process.env.NODE_ENV === "development";

      return (
        <div className="flex min-h-[50vh] items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-surface">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 text-red-text"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="m15 9-6 6" />
                  <path d="m9 9 6 6" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-foreground">
                Something went wrong
              </h1>
            </div>
            <p className="mt-4 text-sm text-muted">
              We encountered an unexpected error. Please try reloading the page.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 w-full rounded-lg bg-blue-strong px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-strong-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Reload page
            </button>
            {isDev && (
              <details className="mt-6 group">
                <summary className="cursor-pointer text-sm font-medium text-muted hover:text-foreground-secondary">
                  Error details (development only)
                </summary>
                <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-border-faint bg-surface-inset p-3 text-xs font-mono text-red-text">
                  {this.state.error.message}
                  {"\n\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
