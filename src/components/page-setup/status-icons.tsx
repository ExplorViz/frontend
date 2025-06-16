import { useCollaborationSessionStore } from '../../stores/collaboration/collaboration-session';
import { useSpectateUserStore } from '../../stores/collaboration/spectate-user';
import { useConfigurationStore } from '../../stores/configuration';
import {
  DeviceCameraVideoIcon,
  EyeClosedIcon,
  GlobeIcon,
  SearchIcon,
} from '@primer/octicons-react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

export default function StatusIcons() {
  const isOnline = useCollaborationSessionStore((state) => state.isOnline);
  const spectatedUser = useSpectateUserStore((state) => state.spectatedUser);
  const isCommRendered = useConfigurationStore((state) => state.isCommRendered);
  const isSemanticZoomEnabled = useConfigurationStore(
    (state) => state.semanticZoomEnabled
  );
  const idToRemoteUser = useCollaborationSessionStore(
    (state) => state.idToRemoteUser
  );

  return (
    <div className="navbar-status-icons">
      {spectatedUser !== null && (
        <div className="navbar-danger-icon">
          <OverlayTrigger
            placement="bottom"
            overlay={<Tooltip>Spectator mode is active</Tooltip>}
          >
            <DeviceCameraVideoIcon size="small" />
          </OverlayTrigger>
        </div>
      )}

      {isSemanticZoomEnabled && (
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip>Semantic Zoom enabled</Tooltip>}
        >
          <SearchIcon color="green" size={24} />
        </OverlayTrigger>
      )}

      {isOnline() && (
        <OverlayTrigger
          placement="bottom"
          overlay={
            <Tooltip>
              Connected to a room with {idToRemoteUser.size + 1} users.
            </Tooltip>
          }
        >
          <div className="navbar-success-icon">
            <>
              <GlobeIcon size="small" />
              &nbsp;({idToRemoteUser.size + 1})
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
