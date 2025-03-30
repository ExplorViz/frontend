import React from 'react';
import Button from 'react-bootstrap/Button';
import { PaintbrushIcon } from '@primer/octicons-react';
import { useHighlightingStore } from 'react-lib/src/stores/highlighting';

interface SecondaryInteractionButtonArgs {
  handleSecondaryCrosshairInteraction(): void;
}

export default function SecondaryInteractionButton({
  handleSecondaryCrosshairInteraction,
}: SecondaryInteractionButtonArgs) {
  const highlightingColor = useHighlightingStore(
    (state) => state.highlightingColor
  )().getHexString();

  return (
    <div id="ar-secondary-interaction-container">
      <Button
        variant="primary"
        style={{ color: highlightingColor }}
        className="half-transparent"
        onClick={handleSecondaryCrosshairInteraction}
      >
        <PaintbrushIcon size="small" className="align-middle ar-button-svg" />
      </Button>
    </div>
  );
}
