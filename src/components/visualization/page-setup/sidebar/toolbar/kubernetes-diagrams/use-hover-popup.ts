import { useCallback, useEffect, useRef, useState } from 'react';

type HoveredNode = { name: string; clientX: number; clientY: number };

/** Delay before showing the hover popup after the cursor enters a node (ms). */
const SHOW_DELAY_MS = 1000;

/** Delay before hiding the popup when the cursor leaves a node (ms).
 *  Long enough for the user to move into the popup itself. */
const HIDE_DELAY_MS = 200;

/** Delay before automatically closing the popup if the user doesn't interact with it (ms). */
const AUTO_CLOSE_DELAY_MS = 2000;

/**
 * Manages the hover popup that appears over diagram nodes.
 *
 * Uses event delegation: the parent container calls handleDiagramMouseOver on
 * every onMouseOver event. The handler reads data-node-name from the event target
 * to detect which node is under the cursor without attaching listeners to each node.
 */
export function useHoverPopup() {
  const [hoveredNode, setHoveredNode] = useState<HoveredNode | null>(null);

  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHoveredNameRef = useRef<string | null>(null);

  // Clean up pending timers on unmount (clearTimeout(null/undefined) is a safe no-op)
  useEffect(() => () => {
    clearTimeout(hoverTimeoutRef.current ?? undefined);
    clearTimeout(hideTimeoutRef.current ?? undefined);
    clearTimeout(autoCloseTimeoutRef.current ?? undefined);
  }, []);

  // Auto-close the popup if the user doesn't interact with it
  useEffect(() => {
    if (hoveredNode) {
      autoCloseTimeoutRef.current = setTimeout(() => {
        setHoveredNode(null);
        autoCloseTimeoutRef.current = null;
      }, AUTO_CLOSE_DELAY_MS);
    } else {
      clearTimeout(autoCloseTimeoutRef.current ?? undefined);
      autoCloseTimeoutRef.current = null;
    }
  }, [hoveredNode]);

  const handleDiagramMouseOver = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const nodeEl = (e.target as Element).closest('[data-node-name]');
      const nodeName = nodeEl?.getAttribute('data-node-name') ?? null;

      if (nodeName === lastHoveredNameRef.current) return;

      if (hideTimeoutRef.current) { clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = null; }
      if (hoverTimeoutRef.current) { clearTimeout(hoverTimeoutRef.current); hoverTimeoutRef.current = null; }

      lastHoveredNameRef.current = nodeName;

      // Only show popup for graph nodes (parent element id contains "node")
      const isNode = nodeEl?.parentElement?.getAttribute('id')?.includes('node');

      if (isNode && nodeName) {
        const { clientX, clientY } = e;
        hoverTimeoutRef.current = setTimeout(() => {
          setHoveredNode({ name: nodeName, clientX, clientY });
        }, SHOW_DELAY_MS);
      } else {
        hideTimeoutRef.current = setTimeout(() => {
          setHoveredNode(null);
          hideTimeoutRef.current = null;
        }, HIDE_DELAY_MS);
      }
    },
    []
  );

  const handleDiagramMouseLeave = useCallback(() => {
    lastHoveredNameRef.current = null;
    if (hoverTimeoutRef.current) { clearTimeout(hoverTimeoutRef.current); hoverTimeoutRef.current = null; }
    hideTimeoutRef.current = setTimeout(() => {
      setHoveredNode(null);
      hideTimeoutRef.current = null;
    }, HIDE_DELAY_MS);
  }, []);

  const handlePopupMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }
  }, []);

  const handlePopupMouseLeave = useCallback(() => {
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }
    hideTimeoutRef.current = setTimeout(() => {
      setHoveredNode(null);
      hideTimeoutRef.current = null;
    }, HIDE_DELAY_MS);
    lastHoveredNameRef.current = null;
  }, []);

  return {
    hoveredNode,
    handleDiagramMouseOver,
    handleDiagramMouseLeave,
    handlePopupMouseEnter,
    handlePopupMouseLeave,
  };
}
