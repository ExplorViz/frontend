import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

export type FloatingPanelPosition = { left: number; top: number };

export function useFloatingPanel(
  anchor: () => FloatingPanelPosition | null,
  dockGap: number
) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const restoreTop = useRef<string | null>(null);
  const restoreLeft = useRef<string | null>(null);
  const lastPointer = useRef({ x: 0, y: 0 });
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;

  const stopDrag = useCallback(() => {
    document.onpointerup = null;
    document.onpointermove = null;
  }, []);

  useEffect(() => {
    if (!element) return;
    const position = anchorRef.current();
    if (!position) return;
    element.style.left = `${position.left}px`;
    element.style.top = `${position.top}px`;
  }, [element]);

  useEffect(() => stopDrag, [stopDrag]);

  useEffect(() => {
    if (!element) return;

    if (!isMinimized) {
      element.style.bottom = '';
      if (restoreTop.current !== null) {
        element.style.top = restoreTop.current;
        restoreTop.current = null;
      }
      if (restoreLeft.current !== null) {
        element.style.left = restoreLeft.current;
        restoreLeft.current = null;
      }
      return;
    }

    restoreTop.current = element.style.top;
    restoreLeft.current = element.style.left;
    element.style.top = 'auto';
    const home = anchorRef.current();
    if (home) element.style.left = `${home.left}px`;

    const bar = document.getElementById('bottom-bar-container');
    const dock = () => {
      element.style.bottom = `${(bar?.getBoundingClientRect().height ?? 0) + dockGap}px`;
    };
    dock();

    if (!bar) return;
    const observer = new ResizeObserver(dock);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [element, isMinimized, dockGap]);

  const onDragStart = useCallback(
    (event: ReactPointerEvent) => {
      event.stopPropagation();
      if (isMinimized || !element) return;

      lastPointer.current = { x: event.clientX, y: event.clientY };
      document.onpointerup = stopDrag;
      document.onpointermove = (moveEvent) => {
        moveEvent.preventDefault();
        const diffX = lastPointer.current.x - moveEvent.clientX;
        const diffY = lastPointer.current.y - moveEvent.clientY;
        lastPointer.current = { x: moveEvent.clientX, y: moveEvent.clientY };

        const maxLeft = window.innerWidth - element.offsetWidth;
        const maxTop = window.innerHeight - element.offsetHeight;
        element.style.left = `${Math.min(Math.max(0, element.offsetLeft - diffX), maxLeft)}px`;
        element.style.top = `${Math.min(Math.max(0, element.offsetTop - diffY), maxTop)}px`;
      };
    },
    [element, isMinimized, stopDrag]
  );

  return {
    ref: setElement,
    isMinimized,
    toggleMinimized: useCallback(() => setIsMinimized((v) => !v), []),
    onDragStart,
  };
}
