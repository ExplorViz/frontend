import React, { useRef } from 'react';
import { Tooltip, Popover } from 'react-bootstrap';
import CopyButton from 'explorviz-frontend/src/components/copy-button.tsx';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { InfoIcon } from '@primer/octicons-react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import { LandscapeToken } from 'explorviz-frontend/src/stores/landscape-token';

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
        <table className="token-info-table">
          <tbody>
            <tr>
              <td>Owner</td>
              <td>{token.ownerId === user?.sub ? 'You' : token.ownerId}</td>
              <td></td>
            </tr>
            <tr>
              <td>ID</td>
              <td>{token.value}</td>
              <td>
                <CopyButton text={token.value} />
              </td>
            </tr>
            {token.secret && (
              <tr>
                <td>Secret</td>
                <td>{token.secret}</td>
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
        <div className="additional-token-info">
          <OverlayTrigger
            placement={'bottom'}
            trigger="click"
            overlay={popover}
            rootClose
          >
            <InfoIcon verticalAlign="middle" size="small" />
          </OverlayTrigger>
        </div>
      </OverlayTrigger>
    </div>
  );
}
