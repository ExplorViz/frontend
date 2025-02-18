import React from 'react';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';
import Tooltip from 'react-bootstrap/Tooltip';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import { CopyIcon } from '@primer/octicons-react';

export default function CopyButton({ text }: { text: string }) {
  const onCopy = () => {
    navigator.clipboard.writeText(text);
    useToastHandlerStore
      .getState()
      .showSuccessToastMessage(text + ' copied to clipboard');
  };

  return (
    <button className="btn" onClick={() => onCopy()}>
      <OverlayTrigger
        placement={'right'}
        trigger={['hover', 'focus']}
        overlay={<Tooltip>Copy to clipboard</Tooltip>}
      >
        <CopyIcon verticalAlign="middle" size="small" fill="#777" />
      </OverlayTrigger>
    </button>
  );
}
