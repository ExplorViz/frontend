import { EyeClosedIcon } from '@primer/octicons-react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useConfigurationStore } from '../../stores/configuration';

export default function StatusIcons() {
  const isCommRendered = useConfigurationStore((state) => state.isCommRendered);

  return (
    <div className="navbar-status-icons">
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
