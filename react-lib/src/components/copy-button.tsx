import React from 'react';

import Tooltip from 'react-bootstrap/Tooltip';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import { CopyIcon } from '@primer/octicons-react';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';

interface CopyButtonProps {
  text: string;
  successMessage?: string;
}

export default function CopyButton({
  text,
  successMessage = `${text} copied to clipboard`,
}: CopyButtonProps) {
  const showSuccessToastMessage = useToastHandlerStore(
    (state) => state.showSuccessToastMessage
  );

  const onCopy = () => {
    navigator.clipboard.writeText(text);
    showSuccessToastMessage(successMessage);
  };

  return (
    <button className="btn button-svg-with-hover" onClick={onCopy}>
      <OverlayTrigger
        placement={'right'}
        trigger={['hover', 'focus']}
        overlay={<Tooltip>Copy to clipboard</Tooltip>}
      >
        <CopyIcon verticalAlign="middle" size="small" />
      </OverlayTrigger>
    </button>
  );
}
