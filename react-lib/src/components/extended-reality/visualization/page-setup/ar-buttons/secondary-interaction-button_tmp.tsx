import React from 'react';
import Button from 'react-bootstrap/Button';
import { PaintbrushIcon } from '@primer/octicons-react';
import { useHighlightingServiceStore } from 'react-lib/src/stores/highlighting-service';

interface SecondaryInteractionButtonArgs {
  handleSecondaryCrosshairInteraction(): void;
}

export default function SecondaryInteractionButton({
  handleSecondaryCrosshairInteraction,
}: SecondaryInteractionButtonArgs) {
  const highlightingColorStyle = useHighlightingServiceStore(
    (state) => state.highlightingColorStyle
  );

  return (
    <div id="ar-secondary-interaction-container">
      <Button
        variant="primary"
        style={highlightingColorStyle}
        className="half-transparent"
        onClick={handleSecondaryCrosshairInteraction}
      >
        <PaintbrushIcon
          size="small"
          className="octicon align-middle ar-button-svg"
        />
      </Button>
    </div>
  );
}
