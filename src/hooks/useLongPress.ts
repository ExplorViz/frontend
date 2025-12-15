import { useEffect, useRef } from 'react';
import { Position2D } from './interaction-modifier';

interface UseLongPressOptions {
  delay?: number;
  movementThreshold?: number;
}

const useLongPress = (
  onLongPress: (position: Position2D) => void,
  options: UseLongPressOptions = {}
) => {
  const { delay: LONG_PRESS_DELAY = 500, movementThreshold = 35 } = options;

  const touchMoved = useRef<boolean>(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosition = useRef<Position2D | null>(null);
  const longPressTriggered = useRef<boolean>(false);

  const onTouchStart = (event: React.TouchEvent) => {
    touchMoved.current = false;
    longPressTriggered.current = false;
    const touch = event.touches[0];
    touchStartPosition.current = { x: touch.pageX, y: touch.pageY };

    // Clear any existing timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    longPressTimer.current = setTimeout(() => {
      if (!touchMoved.current && touchStartPosition.current) {
        longPressTriggered.current = true;
        onLongPress({
          x: touchStartPosition.current.x,
          y: touchStartPosition.current.y,
        });
      }
    }, LONG_PRESS_DELAY);
  };

  const onTouchMove = (event: React.TouchEvent) => {
    if (touchStartPosition.current && event.touches[0]) {
      const touch = event.touches[0];
      const deltaX = Math.abs(touch.pageX - touchStartPosition.current.x);
      const deltaY = Math.abs(touch.pageY - touchStartPosition.current.y);

      // If moved more than threshold, cancel long press
      if (deltaX > movementThreshold || deltaY > movementThreshold) {
        touchMoved.current = true;
        longPressTriggered.current = false;
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }
    }
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    // Cancel long press if touch ends before timer completes
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Prevent default context menu if long press was successfully triggered
    if (longPressTriggered.current) {
      event.preventDefault();
    }

    touchStartPosition.current = null;
    longPressTriggered.current = false;
  };

  useEffect(() => {
    return () => {
      // Cleanup timer on unmount
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };
  }, []);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
};

export default useLongPress;
