import { InfoIcon } from '@primer/octicons-react';
import CopyButton from 'explorviz-frontend/src/components/copy-button.tsx';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { LandscapeToken } from 'explorviz-frontend/src/stores/landscape-token';
import { Popover, Tooltip } from 'react-bootstrap';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import { useState } from 'react';

export default function AdditionalTokenInfo({
  token,
}: {
  token: LandscapeToken;
}) {
  const user = useAuthStore.getInitialState().user;
  const [showTooltip, setShowTooltip] = useState(false);
  const [showPopover, setShowPopover] = useState(false);

  const handleClick = (event: any) => {
    event.stopPropagation();
  };

  const popover = (
    <Popover title={token.alias} onClick={(e) => e.stopPropagation()}>
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
        // Hide the tooltip while the details popover covers it
        show={showTooltip && !showPopover}
        onToggle={setShowTooltip}
        overlay={<Tooltip>Show Token Details</Tooltip>}
      >
        <div>
          <OverlayTrigger
            placement={'bottom'}
            trigger="click"
            show={showPopover}
            onToggle={setShowPopover}
            overlay={popover}
            rootClose
          >
            <button className="button-svg-with-hover" type="button">
              <InfoIcon size="small" className="align-middle" />
            </button>
          </OverlayTrigger>
        </div>
      </OverlayTrigger>
    </div>
  );
}
