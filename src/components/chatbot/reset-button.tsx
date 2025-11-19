import { useCopilotChat } from '@copilotkit/react-core';
import { SyncIcon } from '@primer/octicons-react';
import Button from 'react-bootstrap/Button';

export function ResetButton() {
  const { reset } = useCopilotChat();

  return (
    <Button title="Reset Chat" variant="outline-dark" onClick={() => reset()}>
      <SyncIcon size="small" />
    </Button>
  );
}
