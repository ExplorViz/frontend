import { useCallback, useEffect, useRef, useState } from 'react';
import { useToastHandlerStore } from '../stores/toast-handler';

const codeAgentUrl =
  import.meta.env.VITE_CODE_AGENT_URL || 'http://localhost:8078';

export type ProgressState = {
  status: 'pending' | 'running' | 'finished' | 'failed';
  totalCommits: number;
  analyzedCommits: number;
  totalFiles: number;
  analyzedFiles: number;
  currentAnalysingFile: string | null;
};

type UseWatchAnalysisStateArgs = {
  landscapeToken?: string;
  onUpdate?: (state: ProgressState) => void;
  onFinished?: (state: ProgressState) => void;
  onFailed?: (state: ProgressState) => void;
  onError?: (message: string) => void;
};

export const useWatchAnalysisState = ({
  landscapeToken,
  onUpdate,
  onFinished,
  onFailed,
  onError,
}: UseWatchAnalysisStateArgs) => {
  const [state, setState] = useState<ProgressState | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const showError = useCallback(
    (message: string) => {
      if (onError) {
        onError(message);
        return;
      }

      useToastHandlerStore.getState().showErrorToastMessage(message);
    },
    [onError]
  );

  const clearStatusStream = useCallback(() => {
    if (eventSourceRef.current !== null) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    setState(null);
  }, []);

  const start = useCallback(
    (token?: string) => {
      const tokenToUse = token ?? landscapeToken;
      if (!tokenToUse) {
        showError('No landscape token available for analysis status stream.');
        return false;
      }

    clearStatusStream();
    const eventSource = new EventSource(
        `${codeAgentUrl}/api/analysis/state/stream/${tokenToUse}`
    );
      setIsStreaming(true);

    eventSource.onmessage = (event) => {
      try {
        const state: ProgressState = JSON.parse(event.data) as ProgressState;
        setState(state);
        onUpdate?.(state);

        if (state.status === 'finished') {
          onFinished?.(state);
          clearStatusStream();
        } else if (state.status === 'failed') {
          onFailed?.(state);
          clearStatusStream();
        }
      } catch {
          showError('Received invalid progress update.');
      }
    };

      eventSource.onerror = () => {
        if (eventSource.readyState === EventSource.CLOSED) {
          showError('Error while analysis progress streaming.');
          clearStatusStream();
        }
      };

    eventSourceRef.current = eventSource;
      return true;
    },
    [
      clearStatusStream,
      landscapeToken,
      onFailed,
      onFinished,
      onUpdate,
      showError,
    ]
  );

  useEffect(
    () => () => clearStatusStream(),
    [clearStatusStream]
  );

  return {
    state,
    isStreaming,
    start,
    clearStatusStream,
    reset,
  };
};