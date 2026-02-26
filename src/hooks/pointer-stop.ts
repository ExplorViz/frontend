import { ThreeEvent } from '@react-three/fiber';
import { useEffect, useRef } from 'react';

type PointerStopCallback = (event: ThreeEvent<PointerEvent>) => void;

export function usePointerStop(
  onPointerStop: PointerStopCallback,
  delay = 750
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pointerIsOnMeshRef = useRef<boolean>(true);

  const handlePointerEnter = () => {
    pointerIsOnMeshRef.current = true;
  };

  const handlePointerLeave = () => {
    pointerIsOnMeshRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    // Only the nearest hit object should trigger
    event.stopPropagation();

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (timeoutRef.current && pointerIsOnMeshRef.current) {
        onPointerStop(event);
      }
    }, delay);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    onPointerEnter: handlePointerEnter,
    onPointerMove: handlePointerMove,
    onPointerLeave: handlePointerLeave,
  };
}
