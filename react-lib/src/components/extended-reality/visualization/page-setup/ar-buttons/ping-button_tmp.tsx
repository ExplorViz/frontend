import React from 'react';
import { useCollaborationSessionStore } from 'react-lib/src/stores/collaboration/collaboration-session';
import { useHighlightingServiceStore } from 'react-lib/src/stores/highlighting-service';
import Button from 'react-bootstrap/Button';
import { NorthStarIcon } from '@primer/octicons-react'; // Replace with correct icon if needed

interface PingButtonProps {
  handlePing: () => void;
  userIsAlone: boolean;
}

export default function PingButton({
  handlePing,
  userIsAlone,
}: PingButtonProps) {
  const getAllRemoteUsers = useCollaborationSessionStore(
    (state) => state.getAllRemoteUsers
  );
  const highlightingColorStyle = useHighlightingServiceStore(
    (state) => state.highlightingColorStyle
  );

  return (
    <div id="ar-ping-interaction-container">
      {userIsAlone ? (
        <Button
          variant="primary"
          className="half-transparent"
          onClick={handlePing}
        >
          <NorthStarIcon size="small" className="align-middle ar-button-svg" />
        </Button>
      ) : (
        <Button
          variant="primary"
          style={{
            backgroundColor: highlightingColorStyle,
          }}
          className="half-transparent"
          onClick={handlePing}
        >
          <NorthStarIcon size="small" className="align-middle ar-button-svg" />
        </Button>
      )}
    </div>
  );
}
