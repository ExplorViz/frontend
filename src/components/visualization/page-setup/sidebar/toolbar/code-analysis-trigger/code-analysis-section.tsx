import { RepoAnalysisProgress } from 'explorviz-frontend/src/components/repo-analysis-progress';
import { useWatchAnalysisState } from 'explorviz-frontend/src/hooks/useWatchAnalysisState';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { reloadLandscapeAfterCodeAnalysis } from 'explorviz-frontend/src/utils/code-analysis-reload';
import { useState } from 'react';
import CodeAnalysisTriggerForm from './code-analysis-trigger-form';

type Props = {
  landscapeToken?: string;
};

export const CodeAnalysisSection = ({ landscapeToken }: Props) => {
  const [mode, setMode] = useState<'form' | 'running'>('form');

  const { state: progress, start } = useWatchAnalysisState({
    onFinished: async () => {
      useToastHandlerStore
        .getState()
        .showSuccessToastMessage('Analysis finished successfully.');
      setMode('form');
      await reloadLandscapeAfterCodeAnalysis();
    },
    onFailed: () => {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage('Analysis failed. Try again.');
    },
    onError: (message: string) => {
      useToastHandlerStore.getState().showErrorToastMessage(message);
    },
  });

  const onSubmitSuccess = (landscapeToken: string) => {
    setMode('running');
    start(landscapeToken);
  };

  return (
    <>
      {mode === 'running' ? (
        <RepoAnalysisProgress state={progress} />
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
