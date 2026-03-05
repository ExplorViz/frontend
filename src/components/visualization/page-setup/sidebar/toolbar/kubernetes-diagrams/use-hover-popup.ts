import { useCallback, useEffect, useRef, useState } from 'react';

type HoveredNode = { name: string; clientX: number; clientY: number };
/** A popup that has been explicitly pinned. `left`/`top` are viewport px (position: fixed). */
export type LockedPopup = { id: string; name: string; left: number; top: number };

/** Delay before showing the hover popup after the cursor enters a node (ms). */
const SHOW_DELAY_MS = 1000;

/** Delay before hiding the popup when the cursor leaves a node (ms).
 *  Long enough for the user to move into the popup itself. */
const HIDE_DELAY_MS = 200;

/** Delay before automatically closing the popup if the user doesn't interact with it (ms). */
const AUTO_CLOSE_DELAY_MS = 2000;

/**
 * Manages the hover popup that appears over diagram nodes.
 */
export function useHoverPopup() {
  const [hoveredNode, setHoveredNode] = useState<HoveredNode | null>(null);
  const [wasMoved, setWasMoved] = useState(false);
  const [lockedPopups, setLockedPopups] = useState<LockedPopup[]>([]);

  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHoveredNameRef = useRef<string | null>(null);
  const wasMovedRef = useRef(false);
  const lockedPopupNamesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    wasMovedRef.current = wasMoved;
  }, [wasMoved]);

  useEffect(() => {
    lockedPopupNamesRef.current = new Set(lockedPopups.map((p) => p.name));
  }, [lockedPopups]);

  useEffect(() => () => {
    clearTimeout(hoverTimeoutRef.current ?? undefined);
    clearTimeout(hideTimeoutRef.current ?? undefined);
    clearTimeout(autoCloseTimeoutRef.current ?? undefined);
  }, []);

  // Auto-close only while the popup has not been moved.
  useEffect(() => {
    if (hoveredNode && !wasMoved) {
      autoCloseTimeoutRef.current = setTimeout(() => {
        setHoveredNode(null);
        autoCloseTimeoutRef.current = null;
      }, AUTO_CLOSE_DELAY_MS);
    } else {
      clearTimeout(autoCloseTimeoutRef.current ?? undefined);
      autoCloseTimeoutRef.current = null;
    }
  }, [hoveredNode, wasMoved]);

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

      if (isNode && nodeName && !lockedPopupNamesRef.current.has(nodeName)) {
        const { clientX, clientY } = e;
        hoverTimeoutRef.current = setTimeout(() => {
          setWasMoved(false);
          wasMovedRef.current = false;
          setHoveredNode({ name: nodeName, clientX, clientY });
        }, SHOW_DELAY_MS);
      } else {
        hideTimeoutRef.current = setTimeout(() => {
          if (!wasMovedRef.current) {
            setHoveredNode(null);
            setWasMoved(false);
          }
          hideTimeoutRef.current = null;
        }, HIDE_DELAY_MS);
      }
    },
    []
  );

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
    if (wasMovedRef.current) return;

    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }
    hideTimeoutRef.current = setTimeout(() => {
      setHoveredNode(null);
      setWasMoved(false);
      hideTimeoutRef.current = null;
    }, HIDE_DELAY_MS);
    lastHoveredNameRef.current = null;
  }, []);

  /** Called on the first drag movement – reveals the action button bar and prevents auto-close */
  const movePopup = useCallback(() => {
    setWasMoved(true);
    wasMovedRef.current = true;
    clearTimeout(autoCloseTimeoutRef.current ?? undefined);
    autoCloseTimeoutRef.current = null;
    clearTimeout(hideTimeoutRef.current ?? undefined);
    hideTimeoutRef.current = null;
  }, []);

  /**
   * Pin the current popup.
   */
  const pinPopup = useCallback((left: number, top: number) => {
    setHoveredNode((current) => {
      if (!current) return null;
      setLockedPopups((prev) => [...prev, { id: String(Date.now()), name: current.name, left, top }]);
      return null;
    });
    setWasMoved(false);
    wasMovedRef.current = false;
    lastHoveredNameRef.current = null;
  }, []);

  const closePopup = useCallback(() => {
    setHoveredNode(null);
    setWasMoved(false);
    wasMovedRef.current = false;
    lastHoveredNameRef.current = null;
  }, []);

  const closeLockedPopup = useCallback((id: string) => {
    setLockedPopups((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    hoveredNode,
    wasMoved,
    lockedPopups,
    handleDiagramMouseOver,
    handlePopupMouseEnter,
    handlePopupMouseLeave,
    movePopup,
    pinPopup,
    closePopup,
    closeLockedPopup,
  };
}
