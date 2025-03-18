import React from 'react';
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

  const isSpectating = spectatedUser !== null;
  const isCommunicationHidden = !isCommRendered;
  const users = idToRemoteUser.size + 1;

  return (
    <div className="navbar-status-icons">
      {isSpectating && (
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
          <SearchIcon size={24} />
        </OverlayTrigger>
      )}

      {isOnline() && (
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip>Connected to a room with {users} users.</Tooltip>}
        >
          <div className="navbar-success-icon">
            <>
              <GlobeIcon size="small" />
              &nbsp;({users})
            </>
          </div>
        </OverlayTrigger>
      )}

      {isCommunicationHidden && (
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
