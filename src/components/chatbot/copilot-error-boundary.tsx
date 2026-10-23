import { Component, type ErrorInfo, type ReactNode } from 'react';

interface CopilotErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (error: Error) => void;
  resetKey?: string;
}

interface CopilotErrorBoundaryState {
  hasError: boolean;
}

export class CopilotErrorBoundary extends Component<
  CopilotErrorBoundaryProps,
  CopilotErrorBoundaryState
> {
  state: CopilotErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): CopilotErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      'CopilotKit crashed; chat features are disabled.',
      error,
      errorInfo
    );
    this.props.onError?.(error);
  }

  componentDidUpdate(prevProps: CopilotErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
