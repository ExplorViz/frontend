import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

export type FloatingPanelPosition = { left: number; top: number };

export function useFloatingPanel(anchor: () => FloatingPanelPosition | null, dockGap: number) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const restoreTop = useRef<string | null>(null);
  const restoreLeft = useRef<string | null>(null);
  const lastPointer = useRef({ x: 0, y: 0 });
  const elementRef = useRef<HTMLElement | null>(null);
  const anchorRef = useRef(anchor);

  useEffect(() => {
    anchorRef.current = anchor;
  });

  const ref = useCallback((node: HTMLElement | null) => {
    elementRef.current = node;
    setElement(node);
  }, []);

  const stopDrag = useCallback(() => {
    document.onpointerup = null;
    document.onpointermove = null;
  }, []);

  useEffect(() => {
    const panel = elementRef.current;
    if (!panel) return;
    const position = anchorRef.current();
    if (!position) return;
    panel.style.left = `${position.left}px`;
    panel.style.top = `${position.top}px`;
  }, [element]);

  useEffect(() => stopDrag, [stopDrag]);

  useEffect(() => {
    const panel = elementRef.current;
    if (!panel) return;

    if (!isMinimized) {
      panel.style.bottom = '';
      if (restoreTop.current !== null) {
        panel.style.top = restoreTop.current;
        restoreTop.current = null;
      }
      if (restoreLeft.current !== null) {
        panel.style.left = restoreLeft.current;
        restoreLeft.current = null;
      }
      return;
    }

    restoreTop.current = panel.style.top;
    restoreLeft.current = panel.style.left;
    panel.style.top = 'auto';
    const home = anchorRef.current();
    if (home) panel.style.left = `${home.left}px`;

    const bar = document.getElementById('bottom-bar-container');
    const dock = () => {
      panel.style.bottom = `${(bar?.getBoundingClientRect().height ?? 0) + dockGap}px`;
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
      const panel = elementRef.current;
      if (isMinimized || !panel) return;

      lastPointer.current = { x: event.clientX, y: event.clientY };
      document.onpointerup = stopDrag;
      document.onpointermove = (moveEvent) => {
        moveEvent.preventDefault();
        const diffX = lastPointer.current.x - moveEvent.clientX;
        const diffY = lastPointer.current.y - moveEvent.clientY;
        lastPointer.current = { x: moveEvent.clientX, y: moveEvent.clientY };

        const maxLeft = window.innerWidth - panel.offsetWidth;
        const maxTop = window.innerHeight - panel.offsetHeight;
        panel.style.left = `${Math.min(Math.max(0, panel.offsetLeft - diffX), maxLeft)}px`;
        panel.style.top = `${Math.min(Math.max(0, panel.offsetTop - diffY), maxTop)}px`;
      };
    },
    [element, isMinimized, stopDrag]
  );

  return {
    ref,
    isMinimized,
    toggleMinimized: useCallback(() => setIsMinimized((v) => !v), []),
    onDragStart,
  };
}
