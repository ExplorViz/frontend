import CodeAnalysisTriggerForm from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/code-analysis-trigger/code-analysis-trigger-form';
import { useWatchAnalysisState } from 'explorviz-frontend/src/hooks/useWatchAnalysisState';
import { cancelAnalysisJob } from 'explorviz-frontend/src/utils/cancel-analysis-job';
import { useRef, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { createSearchParams, useNavigate } from 'react-router-dom';
import { useToastHandlerStore } from '../stores/toast-handler';
import { RepoAnalysisProgress } from './repo-analysis-progress';

type Props = {
  show: boolean;
  landscapeToken?: string;
  onClose: () => void;
};

export const RepoAnalysisModal = ({ show, landscapeToken, onClose }: Props) => {
  const [mode, setMode] = useState<'form' | 'running'>('form');
  const [isCancelling, setIsCancelling] = useState(false);
  const activeLandscapeTokenRef = useRef<string | null>(null);
  const navigate = useNavigate();

  const redirectToLandscapePage = (landscapeToken: string) => {
    closeModal();
    navigate({
      pathname: '/visualization',
      search: `?${createSearchParams({ landscapeToken })}`,
    });
  };

  const {
    state: progress,
    start,
    clearStatusStream,
    reset,
  } = useWatchAnalysisState({
    onFinished: () => {
      const token = activeLandscapeTokenRef.current;
      if (token) {
        redirectToLandscapePage(token);
      }
    },
    onFailed: () => {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage('Analysis failed. Try again.');
      closeModal();
    },
    onCancelled: () => {
      useToastHandlerStore
        .getState()
        .showSuccessToastMessage('Analysis cancelled.');
      closeModal();
    },
    onError: (message: string) => {
      useToastHandlerStore.getState().showErrorToastMessage(message);
      closeModal();
    },
  });

  const closeModal = () => {
    setMode('form');
    setIsCancelling(false);
    activeLandscapeTokenRef.current = null;
    reset();
    clearStatusStream();
    onClose();
  };

  const onSuccess = (landscapeToken: string) => {
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

  const onHide = () => {
    if (mode === 'running' && progress?.status !== 'cancelled') {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage(
          'Please wait until the analysis is done or cancel it.'
        );
      return;
    }
    closeModal();
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Repo analysis</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {mode === 'running' ? (
          <RepoAnalysisProgress
            state={progress}
            onCancel={handleCancel}
            isCancelling={isCancelling}
          />
        ) : (
          <CodeAnalysisTriggerForm
            landscapeToken={landscapeToken}
            onSubmitSuccess={onSuccess}
          />
        )}
      </Modal.Body>
    </Modal>
  );
};
