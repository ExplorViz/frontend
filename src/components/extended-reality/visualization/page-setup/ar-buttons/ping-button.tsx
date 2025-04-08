import React from 'react';

import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import Button from 'react-bootstrap/Button';
import { NorthStarIcon } from '@primer/octicons-react';

interface PingButtonProps {
  handlePing: () => void;
}

export default function PingButton({ handlePing }: PingButtonProps) {
  const getAllRemoteUsers = useCollaborationSessionStore(
    (state) => state.getAllRemoteUsers
  );
  const highlightingColor = useHighlightingStore(
    (state) => state.highlightingColor
  )().getHexString();

  const userIsAlone = (() => {
    const numberOfOtherUsers = Array.from(getAllRemoteUsers()).length;

    return numberOfOtherUsers === 0;
  })();

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
            color: highlightingColor,
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
