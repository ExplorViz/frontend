import React, { useState } from 'react';

import { useAuthStore } from '../stores/auth';
import { TinySnapshot } from '../stores/snapshot-token';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import CopyButton from 'explorviz-frontend/src/components/copy-button.tsx';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import { InfoIcon } from '@primer/octicons-react';
import { Tooltip, Popover } from 'react-bootstrap';
import { LandscapeToken } from '../stores/landscape-token';

interface AdditionalSnapshotInfoProps {
  token: {
    owner: string;
    createdAt: number;
    name: string;
    landscapeToken: LandscapeToken;
  };
}

export default function AdditionalSnapshotInfo(
  args: AdditionalSnapshotInfoProps
) {
  const user = useAuthStore((state) => state.user);
  const [focusedClicks, setFocusedClicks] = useState<number>(0);

  const hidePopover = (event: React.FormEvent) => {
    if (isMouseOnPopover()) {
      return;
    }

    // Clicks enable us to differentiate between opened and closed popovers
    if (focusedClicks % 2 === 1) {
      event.target?.dispatchEvent(new Event('click'));
    }
    setFocusedClicks(0);
  };

  const isMouseOnPopover = () => {
    const hoveredElements = document.querySelectorAll(':hover');

    for (const element of hoveredElements) {
      if (element.matches('.popover')) {
        return true;
      }
    }
    return false;
  };

  const onClick = (event: React.FormEvent) => {
    setFocusedClicks(focusedClicks + 1);
    // Prevent click on table row which would trigger to open the visualization
    event.stopPropagation();
  };

  const popover = (
    <Popover id={args.token.landscapeToken.value} title={args.token.landscapeToken.alias}>
      <Popover.Header>{args.token.landscapeToken.alias}</Popover.Header>
      <Popover.Body>
      <table className="table table-striped" style={{ width: '100%' }}>
        <tbody>
          <tr>
            <td>
              <b>Owner</b>
            </td>
            <td style={{ wordBreak: 'break-all' }}>
              {args.token.landscapeToken.ownerId === user?.sub
                ? 'You'
                : args.token.landscapeToken.ownerId}
            </td>
            <td></td>
          </tr>
          <tr>
            <td>
              <b>ID</b>
            </td>
            <td>{args.token.landscapeToken.value}</td>
            <td>
              <CopyButton text={args.token.landscapeToken.value} />
            </td>
          </tr>
          {args.token.landscapeToken.secret && (
            <tr>
              <td>
                {' '}
                <b>Secret</b>
              </td>
              <td style={{ wordBreak: 'break-all' }}>{args.token.landscapeToken.secret}</td>
              <td>
                <CopyButton text={args.token.landscapeToken.secret} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </Popover.Body>
    </Popover>
  );

  return (
    <div id="colorPresets" className="dropdown">
      <OverlayTrigger
        placement={'bottom'}
        trigger={['hover', 'focus']}
        overlay={<Tooltip> Show additional info</Tooltip>}
      >
        <a
          className="button-svg-with-hover"
          type="button"
          onBlur={(event) => hidePopover(event)} // There could be problems with onBlur not working as expected
          onClick={(event) => onClick(event)}
        >
          <OverlayTrigger
            placement={'bottom'}
            trigger="click"
            overlay={popover}
            rootClose
          >
            <InfoIcon verticalAlign="middle" size="small" fill="#777" />
          </OverlayTrigger>
        </a>
      </OverlayTrigger>
    </div>
  );
}
