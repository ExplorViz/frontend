import { Modal } from 'react-bootstrap';
import CodeAnalysisTriggerForm from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/code-analysis-trigger/code-analysis-trigger-form';
import { createSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import LoadingIndicator from './visualization/rendering/loading-indicator';
import { useToastHandlerStore } from '../stores/toast-handler';

type Props = {
  show: boolean;
  onClose: () => void;
}

const codeAgentUrl = import.meta.env.VITE_CODE_AGENT_URL || 'http://localhost:8078';

export const RepoAnalysisModal = ({ show, onClose }: Props) => {
  const [mode, setMode] = useState<'form' | 'waiting'>('form');
  const intervalRef = useRef<number | null>(null);
  const navigate = useNavigate()

  const clearStatusInterval = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  useEffect(
    () => () => clearStatusInterval(),
    []
  );

  const checkAnalysisStatus = async (landscapeToken: string) => {
    const response = await fetch(`${codeAgentUrl}/api/analysis/status/${landscapeToken}`);
    const statusText = await response.text();

    if(statusText === 'finished') {
      redirectToLandspacePage(landscapeToken);
    } else if (statusText === 'failed') {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage('Analysis failed. Try again.');
      onClose();
    }
  }

  const onSuccess = (landscapeToken: string) => {
    setMode('waiting');
    intervalRef.current = window.setInterval(() => checkAnalysisStatus(landscapeToken), 1000);
  }

  const redirectToLandspacePage = (landscapeToken: string) => {
    onClose();
    navigate({
      pathname: '/visualization',
      search: `?${createSearchParams({ landscapeToken })}`,
    });
  }

  const onHide = () => {
    if(mode === 'waiting') {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage('Please wait until the analysis is done...');
      return;
    }
    onClose();
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Repo analysis</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {
          mode === 'waiting' 
            ? (<LoadingIndicator text='Waiting repo analysis to be finished'/>) 
            : <CodeAnalysisTriggerForm assignRandomToken onSubmitSuccess={onSuccess} />
        }
      </Modal.Body>
    </Modal>
  );
}
