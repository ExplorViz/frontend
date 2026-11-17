import { SyncIcon } from '@primer/octicons-react';
import Button from 'react-bootstrap/Button';
import { useResetChat } from './use-reset-chat';

export function ResetButton() {
  const resetChat = useResetChat();

  return (
    <Button title="Reset Chat" variant="outline-dark" onClick={resetChat}>
      <SyncIcon size="small" />
    </Button>
  );
}
