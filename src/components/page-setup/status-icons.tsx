import {
  DeviceCameraVideoIcon,
  EyeClosedIcon,
  GlobeIcon,
} from '@primer/octicons-react';
import { usePlayersList } from 'playroomkit';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useSpectateUserStore } from '../../stores/collaboration/spectate-user';
import { useConfigurationStore } from '../../stores/configuration';

export default function StatusIcons() {
  const userCount = usePlayersList().length;
  const isOnline = userCount > 0;
  const spectatedPlayerId = useSpectateUserStore(
    (state) => state.spectatedPlayerId
  );
  const isCommRendered = useConfigurationStore((state) => state.isCommRendered);

  return (
    <div className="navbar-status-icons">
      {spectatedPlayerId !== null && (
        <div className="navbar-danger-icon">
          <OverlayTrigger
            placement="bottom"
            overlay={<Tooltip>Spectator mode is active</Tooltip>}
          >
            <DeviceCameraVideoIcon size="small" />
          </OverlayTrigger>
        </div>
      )}

      {isOnline && (
        <OverlayTrigger
          placement="bottom"
          overlay={
            <Tooltip>Connected to a room with {userCount} users.</Tooltip>
          }
        >
          <div className="navbar-success-icon">
            <>
              <GlobeIcon size="small" />
              &nbsp;({userCount})
            </>
          </div>
        </OverlayTrigger>
      )}

      {!isCommRendered && (
        <div className="navbar-danger-icon">
          <OverlayTrigger
            placement="bottom"
            overlay={<Tooltip>Communication is hidden</Tooltip>}
          >
            <EyeClosedIcon size="small" />
          </OverlayTrigger>
        </div>
      )}
    </div>
  );
}
