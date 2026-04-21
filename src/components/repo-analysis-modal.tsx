import { Modal } from 'react-bootstrap';
import CodeAnalysisTriggerForm from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/code-analysis-trigger/code-analysis-trigger-form';
import { createSearchParams, useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import { useWatchAnalysisState } from 'explorviz-frontend/src/hooks/useWatchAnalysisState';
import { useToastHandlerStore } from '../stores/toast-handler';
import { RepoAnalysisProgress } from './repo-analysis-progress';

type Props = {
  show: boolean;
  landscapeToken?: string;
  onClose: () => void;
};

export const RepoAnalysisModal = ({ show, landscapeToken, onClose }: Props) => {
  const [mode, setMode] = useState<'form' | 'running'>('form');
  const activeLandscapeTokenRef = useRef<string | null>(null);
  const navigate = useNavigate();

  const redirectToLandscapePage = (landscapeToken: string) => {
    closeModal();
    navigate({
      pathname: '/visualization',
      search: `?${createSearchParams({ landscapeToken })}`,
    });
  };

  const { state: progress, start, clearStatusStream, reset } =
    useWatchAnalysisState({
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
      onError: (message: string) => {
        useToastHandlerStore.getState().showErrorToastMessage(message);
        closeModal();
      },
    });

  const closeModal = () => {
    setMode('form');
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

  const onHide = () => {
    if(mode === 'running') {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage('Please wait until the analysis is done...');
      return;
    }
    closeModal();
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Repo analysis</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {
          mode === 'running' 
            ? (<RepoAnalysisProgress state={progress} />) 
            : <CodeAnalysisTriggerForm landscapeToken={landscapeToken} onSubmitSuccess={onSuccess} />
        }
      </Modal.Body>
    </Modal>
  );
}
