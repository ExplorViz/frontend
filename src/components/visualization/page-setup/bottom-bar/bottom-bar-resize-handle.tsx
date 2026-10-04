import React, { useRef } from 'react';

import { clampBottomBarHeight } from 'explorviz-frontend/src/hooks/useBottomBarHeight';

const KEYBOARD_STEP_IN_PX = 20;
const RESIZING_CLASS = 'bottom-bar-chart-resizing';

interface BottomBarResizeHandleProps {
  height: number;
  // Element whose --bottom-bar-height is previewed while resizing
  barRef: React.RefObject<HTMLElement | null>;
  onResize(newHeight: number): void;
}

/**
 * Re-rendering the visualization page per pointer move takes ~200ms, so the
 * height is previewed directly on the bar element and only committed via
 * onResize once the drag or key press ends.
 */
export default function BottomBarResizeHandle({
  height,
  barRef,
  onResize,
}: BottomBarResizeHandleProps) {
  const dragStart = useRef<{ pointerY: number; height: number } | null>(null);
  const previewHeight = useRef<number | null>(null);

  const preview = (newHeight: number) => {
    const bar = barRef.current;
    if (!bar) {
      return;
    }

    previewHeight.current = clampBottomBarHeight(newHeight);
    bar.classList.add(RESIZING_CLASS);
    bar.style.setProperty('--bottom-bar-height', `${previewHeight.current}px`);
  };

  const commit = () => {
    barRef.current?.classList.remove(RESIZING_CLASS);
    if (previewHeight.current !== null) {
      onResize(previewHeight.current);
      previewHeight.current = null;
    }
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    dragStart.current = { pointerY: event.clientY, height };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) {
      return;
    }

    // Bar grows upwards, so dragging up (smaller clientY) increases height
    preview(
      dragStart.current.height + dragStart.current.pointerY - event.clientY
    );
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) {
      return;
    }

    dragStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    commit();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentHeight = previewHeight.current ?? height;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      preview(currentHeight + KEYBOARD_STEP_IN_PX);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      preview(currentHeight - KEYBOARD_STEP_IN_PX);
    }
  };

  return (
    <div
      className="bottom-bar-resize-handle"
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize bottom bar"
      aria-valuenow={Math.round(height)}
      title="Drag to resize"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onKeyDown={onKeyDown}
      onKeyUp={commit}
      onBlur={commit}
    />
  );
}
