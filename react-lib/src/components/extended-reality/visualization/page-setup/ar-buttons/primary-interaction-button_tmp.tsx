import React, { useEffect, useRef } from 'react';
import Button from 'react-bootstrap/Button';
import { UnfoldIcon } from '@primer/octicons-react';

interface PrimaryInteractionButtonArgs {
  handlePrimaryCrosshairInteraction(): void;
  openAllComponents(): void;
}

export default function PrimaryInteractionButton({
  handlePrimaryCrosshairInteraction,
  openAllComponents,
}: PrimaryInteractionButtonArgs) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const button = buttonRef.current;

    if (button) {
      const checkForLongPress = (start: number) => {
        const end = Date.now();
        const diff = end - start + 1;
        const minLongPressTime = 500;

        if (diff > minLongPressTime) {
          openAllComponents();
        }
      };

      const handleTouchStart = () => {
        const start = Date.now();
        button.ontouchend = () => checkForLongPress(start);
      };

      const handleMouseDown = () => {
        const start = Date.now();
        button.onmouseup = () => checkForLongPress(start);
      };

      button.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        openAllComponents();
        return false;
      });

      button.addEventListener('touchstart', handleTouchStart);
      button.addEventListener('mousedown', handleMouseDown);

      return () => {
        button.removeEventListener('contextmenu', (ev) => {
          ev.preventDefault();
          openAllComponents();
        });
        button.removeEventListener('touchstart', handleTouchStart);
        button.removeEventListener('mousedown', handleMouseDown);
      };
    }
  }, [openAllComponents]);

  return (
    <div id="ar-primary-interaction-container">
      <Button
        ref={buttonRef}
        variant="primary"
        className="half-transparent"
        onClick={handlePrimaryCrosshairInteraction}
        id="ar-primary-interaction-button"
      >
        <UnfoldIcon
          size="small"
          className="octicon align-middle ar-button-svg"
        />
      </Button>
    </div>
  );
}
