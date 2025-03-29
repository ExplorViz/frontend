import React from 'react';

import { useIdeWebsocketFacadeStore } from 'react-lib/src/stores/ide-websocket-facade';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';
import CopyButton from 'react-lib/src/components/copy-button.tsx';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

export default function VscodeExtensionSettings() {
  const isConnected = useIdeWebsocketFacadeStore((state) => state.isConnected);
  const roomName = useIdeWebsocketFacadeStore((state) => state.roomName);

  const numConnectedIDEs = useIdeWebsocketFacadeStore(
    (state) => state.numConnectedIDEs
  );

  const restartConnection = useIdeWebsocketFacadeStore(
    (state) => state.restartConnection
  );

  const showInfoToastMessage = useToastHandlerStore(
    (state) => state.showInfoToastMessage
  );

  const connectToIDE = () => {
    console.log('connectToIDE');
    showInfoToastMessage('Connect to IDE');
    restartConnection();
  };

  return (
    <>
      {isConnected && (
        <>
          <div>
            <label className="bold">Room name:</label>
            <label>{roomName}</label>
            <OverlayTrigger
              placement={'bottom'}
              trigger={['hover', 'focus']}
              overlay={<Tooltip> Copy room name to clipboard</Tooltip>}
            >
              <CopyButton
                text={roomName}
                successMessage="Room name copied to clipboard"
              ></CopyButton>
            </OverlayTrigger>
          </div>
          <div>
            <label>
              <strong>Connected IDEs:</strong>
              {numConnectedIDEs}
            </label>
          </div>
        </>
      )}

      <div className="d-grid gap-2">
        <Button
          title="Connect"
          onClick={connectToIDE}
          variant="outline-secondary"
          className="w-100"
        >
          Connect IDE
        </Button>
      </div>

      <br />
      <br />

      {/* <Button
        title="Monitoring Tool"
        onClick={monitoring}
        variant="outline-secondary"
      >
        Monitoring Tool
      </Button> */}
    </>
  );
}
