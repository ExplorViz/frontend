import { useLayoutEffect, useRef, useState } from 'react';

import ResizeHandle from 'explorviz-frontend/src/components/visualization/page-setup/resize-handle';

const MIN_WIDTH_IN_PERCENT = 20;
// Both sidebars open together never cover the whole canvas
const MAX_WIDTH_IN_PERCENT = 50;
const DEFAULT_WIDTH_IN_PERCENT = 100 / 3;

function clampWidthInPercent(widthInPercent: number) {
  return Math.min(
    Math.max(widthInPercent, MIN_WIDTH_IN_PERCENT),
    MAX_WIDTH_IN_PERCENT
  );
}

function applySidebarWidth(sidebarId: string, widthInPercent: number) {
  document
    .getElementById(sidebarId)
    ?.style.setProperty('--sidebar-width', `${widthInPercent}%`);
}

function percentToPx(widthInPercent: number) {
  return (widthInPercent / 100) * window.innerWidth;
}

interface SidebarResizeHandleProps {
  // Id of the .sidebar element whose --sidebar-width is set
  sidebarId: string;
  side: 'left' | 'right';
  ariaLabel: string;
}

/** Edge of a sidebar facing the canvas, persisting its width in localStorage */
export default function SidebarResizeHandle({
  sidebarId,
  side,
  ariaLabel,
}: SidebarResizeHandleProps) {
  // Key of the former drag button, so widths saved with it still apply
  const storageKey = `${sidebarId}WithInPercent`;
  const [initialWidthInPercent] = useState(() => {
    const storedWidthInPercent = Number(localStorage.getItem(storageKey));
    return clampWidthInPercent(
      storedWidthInPercent > 0 ? storedWidthInPercent : DEFAULT_WIDTH_IN_PERCENT
    );
  });
  const previewWidthInPercent = useRef<number | null>(null);

  // Before paint, so a reopened sidebar never flashes at the default width
  useLayoutEffect(() => {
    applySidebarWidth(sidebarId, initialWidthInPercent);
  }, [sidebarId, initialWidthInPercent]);

  const onPreview = (widthInPx: number) => {
    const widthInPercent = clampWidthInPercent(
      (widthInPx / window.innerWidth) * 100
    );
    previewWidthInPercent.current = widthInPercent;
    applySidebarWidth(sidebarId, widthInPercent);
    return percentToPx(widthInPercent);
  };

  const onCommit = () => {
    if (previewWidthInPercent.current !== null) {
      localStorage.setItem(
        storageKey,
        previewWidthInPercent.current.toString()
      );
      previewWidthInPercent.current = null;
    }
  };

  return (
    <ResizeHandle
      className="sidebar-resize-handle"
      ariaLabel={ariaLabel}
      orientation="vertical"
      // Left sidebar grows to the right, right sidebar grows to the left
      growDirection={side === 'left' ? 1 : -1}
      valueNow={percentToPx(initialWidthInPercent)}
      getSize={() =>
        document.getElementById(sidebarId)?.getBoundingClientRect().width ??
        percentToPx(initialWidthInPercent)
      }
      onPreview={onPreview}
      onCommit={onCommit}
    />
  );
}
