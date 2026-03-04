import { Modal, ProgressBar, Spinner } from 'react-bootstrap';
import CodeAnalysisTriggerForm from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/code-analysis-trigger/code-analysis-trigger-form';
import { createSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useToastHandlerStore } from '../stores/toast-handler';

type Props = {
  show: boolean;
  onClose: () => void;
}

type ProgressState = {
  status: 'pending' | 'running' | 'finished' | 'failed';
  totalCommits: number;
  analyzedCommits: number;
  totalFiles: number;
  analyzedFiles: number;
  currentAnalysingFile: string | null;
}

const codeAgentUrl = import.meta.env.VITE_CODE_AGENT_URL || 'http://localhost:8078';

const LoadingProgress = ({ state }: { state: ProgressState | null }) => {
  if (!state || state.status === 'pending') return (
    <div className='d-flex justify-content-center'>
      <Spinner animation="border" role="status"></Spinner>
    </div>
  )

  const filesProgressInCurrentCommit = state.totalFiles > 0
    ? state.analyzedFiles / state.totalFiles
    : 0;

  const commitUnitsDone = state.analyzedCommits + filesProgressInCurrentCommit;

  const percentage = state.totalCommits > 0
    ? Math.min(100, (commitUnitsDone / state.totalCommits) * 100)
    : 0;

  return (
    <div>
      <p>Analysed commits: {state.analyzedCommits}/{state.totalCommits}</p>      
      <ProgressBar now={percentage} label={`${percentage.toFixed(2)}%`} animated striped />
      {state.currentAnalysingFile && (
        <p className='mt-3'>{state.currentAnalysingFile}</p>
      )}
    </div>
  );
}

export const RepoAnalysisModal = ({ show, onClose }: Props) => {
  const [mode, setMode] = useState<'form' | 'running'>('form');
  const [progress, setProgress] = useState<ProgressState | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const navigate = useNavigate()

  const clearStatusStream = () => {
    if (eventSourceRef.current !== null) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }

  const closeModal = () => {
    setMode('form');
    setProgress(null);
    clearStatusStream();
    onClose();
  }

  useEffect(
    () => () => clearStatusStream(),
    []
  );

  const handleProgressState = (landscapeToken: string, state: ProgressState) => {
    setProgress(state);

    if (state.status === 'finished') {
      redirectToLandspacePage(landscapeToken);
    } else if (state.status === 'failed') {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage('Analysis failed. Try again.');
      closeModal();
    }
  }

  const startStatusStream = (landscapeToken: string) => {
    clearStatusStream();
    const eventSource = new EventSource(
      `${codeAgentUrl}/api/analysis/state/stream/${landscapeToken}`
    );

    eventSource.onmessage = (event) => {
      try {
        const state: ProgressState = JSON.parse(event.data) as ProgressState;
        handleProgressState(landscapeToken, state);
      } catch {
        useToastHandlerStore
          .getState()
          .showErrorToastMessage('Received invalid progress update.');
      }
    };

    eventSource.onerror = () => {
      if (eventSource.readyState === EventSource.CLOSED) {
        useToastHandlerStore
          .getState()
          .showErrorToastMessage('Error while analysis progress streaming.');
        closeModal();
      }
    };

    eventSourceRef.current = eventSource;
  }

  const onSuccess = (landscapeToken: string) => {
    setMode('running');
    startStatusStream(landscapeToken);
  }

  const redirectToLandspacePage = (landscapeToken: string) => {
    closeModal();
    navigate({
      pathname: '/visualization',
      search: `?${createSearchParams({ landscapeToken })}`,
    });
  }

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
            ? (<LoadingProgress state={progress} />) 
            : <CodeAnalysisTriggerForm assignRandomToken onSubmitSuccess={onSuccess} />
        }
      </Modal.Body>
    </Modal>
  );
}
