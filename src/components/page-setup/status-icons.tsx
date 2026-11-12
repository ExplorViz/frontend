import { DeviceCameraVideoIcon, EyeClosedIcon } from '@primer/octicons-react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useConfigurationStore } from '../../stores/configuration';
import { useRoomState } from '../../utils/collaboration/room-connection';
import { useSpectating } from '../../utils/collaboration/spectating';

export default function StatusIcons() {
  const isCommRendered = useConfigurationStore((state) => state.isCommRendered);
  const { target } = useSpectating();
  const spectatedName = useRoomState()?.participants[target ?? '']?.name;

  return (
    <div className="navbar-status-icons">
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
