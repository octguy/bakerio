"use client";

import { Component, ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-8 text-center">
          <p className="text-lg font-semibold mb-2">Something went wrong</p>
          <button onClick={() => this.setState({ hasError: false })} className="text-golden font-medium">Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
