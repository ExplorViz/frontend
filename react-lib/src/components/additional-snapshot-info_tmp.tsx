import React from 'react';

import Auth from 'explorviz-frontend/services/auth';
import { TinySnapshot } from 'explorviz-frontend/services/snapshot-token';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';
import CopyButton from 'react-lib/src/components/copy-button.tsx';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import { InfoIcon } from '@primer/octicons-react';
import { Tooltip, Popover } from 'react-bootstrap';

// Added could help migration
// type TinySnapshot = {
//   owner: string;
//   createdAt: number;
//   name: string;
//   landscapeToken: LandscapeToken;
// };

// Temporary because the .ts and handlebars file don't contain a token eventhough its use in the handlebars file, maybe just use LandscapeToken?
// This file seems like a direct copy of AdditionalTokenInfo.ts/.hbs/.tsx
interface AdditionalSnapshotInfoProps {
  token: {
    alias: string;
    owner: string;
    value: string;
    ownerId: string;
    landscapeToken: { value: string };
  };
  authUserId: string;
}

export default function AdditionalSnapshotInfo(
  args: AdditionalSnapshotInfoProps
) {
  const hidePopover = (event: Event) => {
    if (this.isMouseOnPopover()) {
      return;
    }

    // Clicks enable us to differentiate between opened and closed popovers
    if (this.focusedClicks % 2 === 1) {
      event.target?.dispatchEvent(new Event('click'));
    }
    this.focusedClicks = 0;
  };

  const onClick = (event: Event) => {
    this.focusedClicks += 1;
    // Prevent click on table row which would trigger to open the visualization
    event.stopPropagation();
  };

  const popover = (
    <Popover id={args.token.value} title={args.token.alias}>
      <table className="table-striped" style={{ width: '100%' }}>
        <tbody>
          <tr>
            <td>
              <b>Owner</b>
            </td>
            <td style={{ wordBreak: 'break-all' }}>
              {Number(args.token.ownerId) === user?.sub
                ? 'You'
                : args.token.ownerId}
            </td>
            <td>
              <CopyButton text={args.token.ownerId} />
            </td>
          </tr>
          <tr>
            <td>
              <b>ID</b>
            </td>
            <td>{args.token.value}</td>
            <td>
              <CopyButton text={args.token.value} />
            </td>
          </tr>
          {args.token.secret && (
            <tr>
              <td>
                {' '}
                <b>Secret</b>
              </td>
              <td style={{ wordBreak: 'break-all' }}>{args.token.secret}</td>
              <td>
                <CopyButton text={args.token.secret} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
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
          tabindex="0"
          href="#"
          // {{on 'focusout' this.hidePopover}}
          onBlur={(event) => hidePopover(event)} // There could be problems with onBlur not working as expected
          // {{on 'click' this.onClick}}
          onClick={(event) => onClick(event)}
        >
          <InfoIcon verticalAlign="middle" size="small" />
          <OverlayTrigger
            placement={'bottom'}
            trigger="click"
            overlay={popover}
          >
            <InfoIcon verticalAlign="middle" size="small" fill="#777" />
          </OverlayTrigger>
        </a>
      </OverlayTrigger>
    </div>
  );
}
