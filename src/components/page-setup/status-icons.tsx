import { DeviceCameraVideoIcon, EyeClosedIcon, PeopleIcon, SyncIcon } from '@primer/octicons-react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useConfigurationStore } from '../../stores/configuration';
import { useReconnecting, useRoomConnectionStore, useRoomState } from '../../utils/collaboration/room-connection';
import { useSpectating } from '../../utils/collaboration/spectating';

export default function StatusIcons() {
  const isCommRendered = useConfigurationStore((state) => state.isCommRendered);
  const { target, targetName: spectatedName } = useSpectating();
  const reconnecting = useReconnecting();
  const roomCode = useRoomConnectionStore((state) => state.room?.roomId);
  const roomName = useRoomState()?.roomName;
  const roomLabel = `Connected to room ${roomName ? `${roomName} (${roomCode})` : roomCode}`;

  return (
    <div className="navbar-status-icons">
      {roomCode && !reconnecting && (
        <div className="navbar-success-icon" aria-label={roomLabel}>
          <OverlayTrigger placement="bottom" overlay={<Tooltip>{roomLabel}</Tooltip>}>
            <PeopleIcon size="small" />
          </OverlayTrigger>
        </div>
      )}
      {reconnecting && (
        <div className="navbar-danger-icon" aria-label="Reconnecting to the room">
          <OverlayTrigger placement="bottom" overlay={<Tooltip>Reconnecting to the room…</Tooltip>}>
            <SyncIcon size="small" />
          </OverlayTrigger>
        </div>
      )}
      {target && (
        <div className="navbar-danger-icon" aria-label={`Spectating ${spectatedName ?? ''}`}>
          <OverlayTrigger placement="bottom" overlay={<Tooltip>Spectating {spectatedName}</Tooltip>}>
            <DeviceCameraVideoIcon size="small" />
          </OverlayTrigger>
        </div>
      )}
      {!isCommRendered && (
        <div className="navbar-danger-icon">
          <OverlayTrigger placement="bottom" overlay={<Tooltip>Communication is hidden</Tooltip>}>
            <EyeClosedIcon size="small" />
          </OverlayTrigger>
        </div>
      )}
    </div>
  );
}
