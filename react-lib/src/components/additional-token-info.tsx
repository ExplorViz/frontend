import React from 'react';
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
  const user = useAuthStore.getInitialState().user;

  const handleClick = (event: any) => {
    event.stopPropagation();
  };

  const popover = (
    <Popover id={token.value} title={token.alias}>
      <table className="table-striped" style={{ width: '100%' }}>
        <tbody>
          <tr>
            <td>
              <b>Owner</b>
            </td>
            <td style={{ wordBreak: 'break-all' }}>
              {token.ownerId === user?.sub ? 'You' : token.ownerId}
            </td>
            <td>
              <CopyButton text={token.ownerId} />
            </td>
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
    </Popover>
  );

  return (
    <div onClick={(event) => handleClick(event)}>
      <OverlayTrigger
        placement={'bottom'}
        trigger={['hover', 'focus']}
        overlay={<Tooltip>Show Token Details</Tooltip>}
      >
        <OverlayTrigger placement={'bottom'} trigger="click" overlay={popover}>
          <InfoIcon verticalAlign="middle" size="small" fill="#777" />
        </OverlayTrigger>
      </OverlayTrigger>
    </div>
  );
}
