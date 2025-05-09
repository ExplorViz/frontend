import { ThreeEvent } from '@react-three/fiber';
import { useRef, useEffect, useCallback } from 'react';

type PointerStopCallback = (event: ThreeEvent<PointerEvent>) => void;

export function usePointerStop(
  onPointerStop: PointerStopCallback,
  delay = 750
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pointerIsOnMeshRef = useRef<boolean>(true);

  const handlePointerEnter = useCallback(() => {
    pointerIsOnMeshRef.current = true;
  }, []);

  const handlePointerLeave = useCallback(() => {
    pointerIsOnMeshRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        if (timeoutRef.current && pointerIsOnMeshRef.current) {
          onPointerStop(event);
        }
      }, delay);
    },
    [delay, onPointerStop]
  );

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
