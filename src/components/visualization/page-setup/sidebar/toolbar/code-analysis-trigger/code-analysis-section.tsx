import { RepoAnalysisProgress } from 'explorviz-frontend/src/components/repo-analysis-progress';
import { useWatchAnalysisState } from 'explorviz-frontend/src/hooks/useWatchAnalysisState';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { cancelAnalysisJob } from 'explorviz-frontend/src/utils/cancel-analysis-job';
import { reloadLandscapeAfterCodeAnalysis } from 'explorviz-frontend/src/utils/code-analysis-reload';
import { useRef, useState } from 'react';
import CodeAnalysisTriggerForm from './code-analysis-trigger-form';

type Props = {
  landscapeToken?: string;
};

export const CodeAnalysisSection = ({ landscapeToken }: Props) => {
  const [mode, setMode] = useState<'form' | 'running'>('form');
  const [isCancelling, setIsCancelling] = useState(false);
  const activeLandscapeTokenRef = useRef<string | null>(null);

  const { state: progress, start } = useWatchAnalysisState({
    onFinished: async () => {
      activeLandscapeTokenRef.current = null;
      useToastHandlerStore
        .getState()
        .showSuccessToastMessage('Analysis finished successfully.');
      setMode('form');
      await reloadLandscapeAfterCodeAnalysis();
    },
    onFailed: () => {
      activeLandscapeTokenRef.current = null;
      useToastHandlerStore
        .getState()
        .showErrorToastMessage('Analysis failed. Try again.');
      setMode('form');
    },
    onCancelled: () => {
      activeLandscapeTokenRef.current = null;
      useToastHandlerStore
        .getState()
        .showSuccessToastMessage('Analysis cancelled.');
      setMode('form');
    },
    onError: (message: string) => {
      activeLandscapeTokenRef.current = null;
      useToastHandlerStore.getState().showErrorToastMessage(message);
      setMode('form');
    },
  });

  const onSubmitSuccess = (landscapeToken: string) => {
    activeLandscapeTokenRef.current = landscapeToken;
    setMode('running');
    start(landscapeToken);
  };

  const handleCancel = async () => {
    const token = activeLandscapeTokenRef.current;
    if (!token || isCancelling) {
      return;
    }

    setIsCancelling(true);
    try {
      const result = await cancelAnalysisJob(token);
      if (!result.ok) {
        useToastHandlerStore
          .getState()
          .showErrorToastMessage(
            result.message || 'Failed to cancel analysis.'
          );
      }
    } catch (error: any) {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage(
          `Failed to cancel analysis: ${error.message || 'Network error'}`
        );
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      {mode === 'running' ? (
        <RepoAnalysisProgress
          state={progress}
          onCancel={handleCancel}
          isCancelling={isCancelling}
        />
      ) : (
        <CodeAnalysisTriggerForm
          landscapeToken={landscapeToken}
          assignRandomToken={!landscapeToken}
          onSubmitSuccess={onSubmitSuccess}
        />
      )}
    </>
  );
};
