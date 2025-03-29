import React, { useRef } from 'react';
import { Tooltip, Popover } from 'react-bootstrap';
import CopyButton from 'react-lib/src/components/copy-button.tsx';
import { useAuthStore } from 'react-lib/src/stores/auth';
import { InfoIcon } from '@primer/octicons-react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import { LandscapeToken } from 'react-lib/src/stores/landscape-token';

export default function AdditionalTokenInfo({
  token,
}: {
  token: LandscapeToken;
}) {
  const focusedClicks = useRef<number>(0);

  const user = useAuthStore.getInitialState().user;

  const hidePopover = (event: React.FormEvent) => {
    // Clicks enable us to differentiate between opened and closed popovers
    if (focusedClicks.current % 2 === 1) {
      event.target?.dispatchEvent(new Event('click'));
    }
    focusedClicks.current = 0;
  };

  const handleClick = (event: any) => {
    event.stopPropagation();
  };

  const popover = (
    <Popover title={token.alias}>
      <Popover.Header>{token.alias}</Popover.Header>
      <Popover.Body>
      <table className="table table-striped" style={{ width: '100%' }}>
        <tbody>
          <tr>
            <td>
              <b>Owner</b>
            </td>
            <td style={{ wordBreak: 'break-all' }}>
              {token.ownerId === user?.sub ? 'You' : token.ownerId}
            </td>
            <td></td>
          </tr>
          <tr>
            <td>
              <b>ID</b>
            </td>
            <td>{token.value}</td>
            <td>
              <CopyButton text={token.value} />
            </td>
          </tr>
          {token.secret && (
            <tr>
              <td>
                {' '}
                <b>Secret</b>
              </td>
              <td style={{ wordBreak: 'break-all' }}>{token.secret}</td>
              <td>
                <CopyButton text={token.secret} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </Popover.Body>
    </Popover>
  );

  return (
    <div onClick={(event) => handleClick(event)}>
      <OverlayTrigger
        placement={'bottom'}
        trigger={['hover', 'focus']}
        overlay={<Tooltip>Show Token Details</Tooltip>}
      >
        <div>
          <OverlayTrigger placement={'bottom'} trigger="click" overlay={popover} rootClose>
            <InfoIcon verticalAlign="middle" size="small" fill="#777" />
          </OverlayTrigger>
        </div>
      </OverlayTrigger>
    </div>
  );
}
