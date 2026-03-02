import { Modal } from 'react-bootstrap';
import CodeAnalysisTriggerForm from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/code-analysis-trigger/code-analysis-trigger-form';
import { createSearchParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import LoadingIndicator from './visualization/rendering/loading-indicator';
import { useToastHandlerStore } from '../stores/toast-handler';

type Props = {
  show: boolean;
  onClose: () => void;
}

export const RepoAnalysisModal = ({ show, onClose }: Props) => {
  const [mode, setMode] = useState<'form' | 'waiting'>('form');
  const [pendingLandscapeToken, setPendingLandspaceToken] = useState<string>();
  const navigate = useNavigate()

  const onSuccess = (landscapeToken: string) => {
    setMode('waiting');
    setPendingLandspaceToken(landscapeToken);

    setTimeout(() => {
      redirectToLandspacePage(landscapeToken)
    }, 10000)
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
