import React, { useRef } from 'react';

import ResizeHandle from 'explorviz-frontend/src/components/visualization/page-setup/resize-handle';
import { clampBottomBarHeight } from 'explorviz-frontend/src/hooks/useBottomBarHeight';

const RESIZING_CLASS = 'bottom-bar-chart-resizing';

interface BottomBarResizeHandleProps {
  height: number;
  // Element whose --bottom-bar-height is previewed while resizing
  barRef: React.RefObject<HTMLElement | null>;
  onResize(newHeight: number): void;
}

/** Top edge of the bottom bar, committing its height on release via onResize */
export default function BottomBarResizeHandle({ height, barRef, onResize }: BottomBarResizeHandleProps) {
  const previewHeight = useRef<number | null>(null);

  const onPreview = (newHeight: number) => {
    const clampedHeight = clampBottomBarHeight(newHeight);
    previewHeight.current = clampedHeight;

    const bar = barRef.current;
    if (bar) {
      bar.classList.add(RESIZING_CLASS);
      bar.style.setProperty('--bottom-bar-height', `${clampedHeight}px`);
    }
    return clampedHeight;
  };

  const onCommit = () => {
    barRef.current?.classList.remove(RESIZING_CLASS);
    if (previewHeight.current !== null) {
      onResize(previewHeight.current);
      previewHeight.current = null;
    }
  };

  return (
    <ResizeHandle
      className="bottom-bar-resize-handle"
      ariaLabel="Resize bottom bar"
      orientation="horizontal"
      // Bar grows upwards, so moving the pointer down shrinks it
      growDirection={-1}
      valueNow={height}
      getSize={() => previewHeight.current ?? height}
      onPreview={onPreview}
      onCommit={onCommit}
    />
  );
}
