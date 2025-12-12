import { useEffect, useRef } from 'react';

import { UnfoldIcon } from '@primer/octicons-react';
import Button from 'react-bootstrap/Button';

interface PrimaryInteractionButtonArgs {
  handlePrimaryCrosshairInteraction(): void;
  openAllComponents(): void;
}

export default function PrimaryInteractionButton({
  handlePrimaryCrosshairInteraction,
  openAllComponents,
}: PrimaryInteractionButtonArgs) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const button = buttonRef.current;

    if (!button) {
      console.error('Unable to assign button ref');
      return;
    }

    function checkForLongPress(start: number) {
      const end = Date.now();
      const diff = end - start + 1;
      const minLongPressTime = 500;

      if (diff > minLongPressTime) {
        openAllComponents();
      }
    }

    let start: number;

    // Touch listener
    button.ontouchstart = () => {
      start = Date.now();

      button.ontouchend = () => {
        checkForLongPress(start);
      };
    };

    // Mouse listener
    button.onmousedown = () => {
      start = Date.now();

      button.onmouseup = () => {
        checkForLongPress(start);
      };
    };
  }, []);

  return (
    <div id="ar-primary-interaction-container">
      <Button
        ref={buttonRef}
        variant="primary"
        id="ar-primary-interaction-button"
        className="half-transparent"
        onClick={handlePrimaryCrosshairInteraction}
      >
        <UnfoldIcon size="small" className="align-middle ar-button-svg" />
      </Button>
    </div>
  );
}
