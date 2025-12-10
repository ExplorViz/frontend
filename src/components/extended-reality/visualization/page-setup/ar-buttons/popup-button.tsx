import { InfoIcon } from '@primer/octicons-react';
import { useEffect, useRef } from 'react';
import Button from 'react-bootstrap/Button';

interface PopupButtonArgs {
  handleInfoInteraction(): void;
  removeAllPopups(): void;
}

export default function PopupButton({
  handleInfoInteraction,
  removeAllPopups,
}: PopupButtonArgs) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const button = buttonRef.current;

    if (button) {
      const checkForLongPress = (start: number) => {
        const end = Date.now();
        const diff = end - start + 1;
        const minLongPressTime = 500;

        if (diff > minLongPressTime) {
          removeAllPopups();
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
        removeAllPopups();
        return false;
      });

      button.addEventListener('touchstart', handleTouchStart);
      button.addEventListener('mousedown', handleMouseDown);

      return () => {
        button.removeEventListener('contextmenu', (ev) => {
          ev.preventDefault();
          removeAllPopups();
        });
        button.removeEventListener('touchstart', handleTouchStart);
        button.removeEventListener('mousedown', handleMouseDown);
      };
    }
  }, []);

  return (
    <div id="ar-info-interaction-container">
      <Button
        ref={buttonRef}
        variant="primary"
        className="half-transparent"
        onClick={handleInfoInteraction}
      >
        <InfoIcon size="small" className="octicon align-middle ar-button-svg" />
      </Button>
    </div>
  );
}
