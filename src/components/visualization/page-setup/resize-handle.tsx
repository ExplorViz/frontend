import React, { useRef } from 'react';

const KEYBOARD_STEP_IN_PX = 20;

interface ResizeHandleProps {
  className: string;
  ariaLabel: string;
  // A horizontal separator is dragged vertically and resizes a height,
  // a vertical separator is dragged horizontally and resizes a width
  orientation: 'horizontal' | 'vertical';
  // 1 if moving the pointer right/down grows the panel, -1 if it shrinks it
  growDirection: 1 | -1;
  // Current size in px, used for aria-valuenow until the first resize
  valueNow: number;
  // Size in px when a drag or key press starts
  getSize(): number;
  // Applies a size in px during the interaction, returns the size actually
  // applied after clamping
  onPreview(size: number): number;
  // Persists the previewed size once the drag or key press ends
  onCommit(): void;
}

/**
 * Edge handle for resizing panels by dragging or with the arrow keys.
 * Sizes are previewed directly on the DOM via onPreview and only committed
 * once the interaction ends, since re-rendering the visualization page per
 * pointer move takes ~200ms.
 */
export default function ResizeHandle({
  className,
  ariaLabel,
  orientation,
  growDirection,
  valueNow,
  getSize,
  onPreview,
  onCommit,
}: ResizeHandleProps) {
  const handleRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ pointer: number; size: number } | null>(null);

  const pointerPosition = (event: React.PointerEvent) => (orientation === 'horizontal' ? event.clientY : event.clientX);

  const preview = (size: number) => {
    const appliedSize = onPreview(size);
    handleRef.current?.setAttribute('aria-valuenow', Math.round(appliedSize).toString());
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    dragStart.current = { pointer: pointerPosition(event), size: getSize() };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) {
      return;
    }

    const pointerDelta = pointerPosition(event) - dragStart.current.pointer;
    preview(dragStart.current.size + pointerDelta * growDirection);
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) {
      return;
    }

    dragStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onCommit();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const increasingKey = orientation === 'horizontal' ? 'ArrowDown' : 'ArrowRight';
    const decreasingKey = orientation === 'horizontal' ? 'ArrowUp' : 'ArrowLeft';

    let keyDirection: number;
    if (event.key === increasingKey) {
      keyDirection = 1;
    } else if (event.key === decreasingKey) {
      keyDirection = -1;
    } else {
      return;
    }

    event.preventDefault();
    preview(getSize() + KEYBOARD_STEP_IN_PX * keyDirection * growDirection);
  };

  return (
    <div
      ref={handleRef}
      className={`resize-handle ${className}`}
      role="separator"
      aria-orientation={orientation}
      aria-label={ariaLabel}
      aria-valuenow={Math.round(valueNow)}
      title="Drag to resize"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onKeyDown={onKeyDown}
      onKeyUp={onCommit}
      onBlur={onCommit}
    />
  );
}
