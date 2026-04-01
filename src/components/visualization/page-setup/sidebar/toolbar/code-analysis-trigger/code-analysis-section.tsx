import { RepoAnalysisProgress } from "explorviz-frontend/src/components/repo-analysis-progress";
import { useWatchAnalysisState } from "explorviz-frontend/src/hooks/useWatchAnalysisState";
import { useToastHandlerStore } from "explorviz-frontend/src/stores/toast-handler";
import { useState } from "react";
import CodeAnalysisTriggerForm from "./code-analysis-trigger-form";
import { useReloadHandlerStore } from "explorviz-frontend/src/stores/reload-handler";
import { useRenderingServiceStore } from "explorviz-frontend/src/stores/rendering-service";
import { Timestamp } from "explorviz-frontend/src/utils/landscape-schemes/timestamp";

export const CodeAnalysisSection = () => {
  const [mode, setMode] = useState<'form' | 'running'>('form');
  const loadLandscapeByTimestamp = useReloadHandlerStore(
    (state) => state.loadLandscapeByTimestamp
  );
  const renderingServiceTriggerRenderingForGivenTimestamp =
    useRenderingServiceStore(
      (state) => state.triggerRenderingForGivenTimestamps
    );

  const { state: progress, start } =
      useWatchAnalysisState({
        onFinished: async () => {
          useToastHandlerStore
            .getState()
            .showSuccessToastMessage('Analysis finished successfully.');
          setMode('form');

          // TODO: following lines copied from visualization page, 
          // Check whether we should refactor this later 
          // or is there other way to do this
          const timestamp = Date.now()
          const commitToSelectedTimestampMap = new Map<string, Timestamp[]>();
          commitToSelectedTimestampMap.set('cross-commit', [
            { epochNano: timestamp, spanCount: 0 },
          ]);
          await loadLandscapeByTimestamp(timestamp);
          renderingServiceTriggerRenderingForGivenTimestamp(
            commitToSelectedTimestampMap
          );
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
  }

  return (
    <>
      {mode === 'running' ? (
        <RepoAnalysisProgress state={progress} />
      ) : (
        <CodeAnalysisTriggerForm onSubmitSuccess={onSubmitSuccess} />
      )}
    </>
  )
}