import React from 'react';

import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { Placement } from 'react-bootstrap/types';
import { InfoIcon } from '@primer/octicons-react';

interface HelpTooltipProps {
  title: String;
  placement?: Placement;
}

export default function HelpTooltip({
  title,
  placement = 'left',
}: HelpTooltipProps) {
  return (
    <OverlayTrigger
      placement={placement}
      trigger={['hover', 'focus']}
      overlay={<Tooltip>{title}</Tooltip>}
    >
      <div
        className="inline"
        style={{ marginLeft: '0.25rem', marginRight: '0.25rem' }}
      >
        <InfoIcon className="align-middle" size="small" fill="#777" />
      </div>
    </OverlayTrigger>
  );
}
