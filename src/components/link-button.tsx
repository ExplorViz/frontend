import { LinkExternalIcon } from '@primer/octicons-react';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

interface LinkButtonProps {
  url?: string;
  disabled?: boolean;
  tooltip?: string;
  appearance?: 'icon' | 'outline-button';
  label?: string;
  className?: string;
}

export default function LinkButton({
  url,
  disabled = false,
  tooltip = 'Open source file',
  appearance = 'icon',
  label,
  className,
}: LinkButtonProps) {
  const isDisabled = disabled || !url;

  if (appearance === 'outline-button') {
    const buttonLabel = label ?? tooltip;
    const content = (
      <>
        <LinkExternalIcon verticalAlign="middle" size="small" className="me-1" />
        {buttonLabel}
      </>
    );

    if (isDisabled) {
      return (
        <Button
          type="button"
          variant="outline-secondary"
          size="sm"
          disabled
          className={className}
          title={tooltip}
        >
          {content}
        </Button>
      );
    }

    return (
      <Button
        as="a"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        variant="outline-secondary"
        size="sm"
        className={className}
        title={tooltip}
      >
        {content}
      </Button>
    );
  }

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
