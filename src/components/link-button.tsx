import { LinkExternalIcon } from '@primer/octicons-react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

interface LinkButtonProps {
  url?: string;
  disabled?: boolean;
  tooltip?: string;
}

export default function LinkButton({
  url,
  disabled = false,
  tooltip = 'Open source file',
}: LinkButtonProps) {
  const isDisabled = disabled || !url;

  const icon = (
    <OverlayTrigger
      placement="right"
      trigger={['hover', 'focus']}
      overlay={<Tooltip>{tooltip}</Tooltip>}
    >
      <LinkExternalIcon verticalAlign="middle" size="small" />
    </OverlayTrigger>
  );

  if (isDisabled) {
    return (
      <button
        type="button"
        className="copy-btn button-svg-with-hover"
        disabled
        aria-label={tooltip}
      >
        {icon}
      </button>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="copy-btn button-svg-with-hover"
      aria-label={tooltip}
    >
      {icon}
    </a>
  );
}
