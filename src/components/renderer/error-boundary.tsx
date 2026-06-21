"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: React.ReactNode;
  /** Optional custom fallback. */
  fallback?: React.ReactNode;
  /** Label shown in the default fallback (e.g. the widget/view title). */
  label?: string;
}

interface State {
  hasError: boolean;
  message?: string;
}

/**
 * Catches render-time errors so one broken component never crashes the page.
 * This is the last line of defense behind config normalization — even if a
 * renderer hits something unexpected, the rest of the UI keeps working.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown) {
    console.error("[renderer] component error:", error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">
              {this.props.label
                ? `Couldn't render "${this.props.label}"`
                : "This component failed to render"}
            </p>
            {this.state.message && (
              <p className="mt-0.5 text-xs opacity-80">{this.state.message}</p>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
