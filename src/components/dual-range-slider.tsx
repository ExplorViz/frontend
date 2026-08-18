import React, { useEffect, useRef, useState } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { PopperRef } from 'react-bootstrap/esm/types';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function percentage(value: number, min: number, max: number) {
  return ((value - min) / (max - min)) * 100;
}

type DualRangeSliderProps = {
  /** Minimum allowed slider value. */
  min: number;

  /** Maximum allowed slider value. */
  max: number;

  /** Increment size by which all dialed values are snapped (default = 1) */
  step?: number;

  /** Initial range to select (default = [min, max]) */
  initialValues?: [number, number];

  /**
   * When using within a form, this name will be used to report the lower range value.
   * If left undefined, then no form value will be reported for the lower bound.
   */
  lowerFormName?: string;

  /**
   * When using within a form, this name will be used to report the upper range value.
   * If left undefined, then no form value will be reported for the upper bound.
   */
  upperFormName?: string;

  disabled?: boolean;

  /**
   * Called whenever a thumb is moved, with the new bounds of the range.
   * The bounds are sorted such that the smaller value will always appear first.
   */
  onChange?: (value: [number, number]) => void;

  /**
   * Function that provides a tooltip string to display over the selected thumb while dialing in a value.
   * If left undefined, the tooltip will simply display the current value as a string.
   */
  getTooltipText?: (value: number) => string;
};

/**
 * A dual-thumb range slider for selecting a numeric range between a given minimum and maximum value.
 *
 * The thumbs are allowed to cross over. The reported range boundaries are always sorted in ascending order.
 */
export default function DualRangeSlider({
  min,
  max,
  step = 1,
  initialValues = [min, max],
  lowerFormName,
  upperFormName,
  disabled = false,
  onChange,
  getTooltipText,
}: DualRangeSliderProps) {
  const [range, setRange] = useState<[number, number]>(initialValues);
  const trackRef = useRef<HTMLDivElement>(null);

  const pointerPositionToValue = (clientX: number) => {
    const track = trackRef.current;
    if (!track) {
      return min;
    }

    const rect = track.getBoundingClientRect();
    const percent = clamp((clientX - rect.left) / rect.width, 0, 1);

    const rawValue = min + percent * (max - min);
    const snappedValue = Math.round((rawValue - min) / step) * step + min;

    return clamp(snappedValue, min, max);
  };

  const handleMove = (index: 0 | 1, clientX: number) => {
    const newValue = pointerPositionToValue(clientX);
    const newRange: [number, number] =
      index === 0 ? [newValue, range[1]] : [range[0], newValue];
    setRange(newRange);
    onChange?.(newRange.toSorted() as [number, number]);
  };

  const thumbs = [
    <SliderThumb
      key={0}
      value={range[0]}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onMove={(val) => handleMove(0, val)}
      setValue={(val) => setRange([clamp(val, min, max), range[1]])}
      getTooltipText={getTooltipText}
    />,

    <SliderThumb
      key={1}
      value={range[1]}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onMove={(val) => handleMove(1, val)}
      setValue={(val) => setRange([range[0], clamp(val, min, max)])}
      getTooltipText={getTooltipText}
    />,
  ];

  const selectedStart = percentage(Math.min(range[0], range[1]), min, max);
  const selectedWidth = percentage(Math.abs(range[1] - range[0]), min, max);

  return (
    <div
      ref={trackRef}
      draggable="false"
      style={{
        position: 'relative',
        width: '100%',
        height: 32,
      }}
    >
      <div
        draggable="false"
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '8px',
          transform: 'translateY(-50%)',
          background: 'var(--bs-gray-200)',
          borderRadius: 999,
        }}
      />

      <div
        draggable="false"
        style={{
          position: 'absolute',
          top: '50%',
          left: `${selectedStart}%`,
          width: `${selectedWidth}%`,
          height: '8px',
          transform: 'translateY(-50%)',
          background: disabled ? 'var(--bs-gray-400)' : 'var(--bs-primary)',
          borderRadius: 999,
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 7,
          right: 7,
          top: 0,
          bottom: 0,
        }}
      >
        {/* Sort thumbs in DOM for intuitive tab order even after crossover */}
        {range[0] <= range[1] ? thumbs : thumbs.toReversed()}

        {lowerFormName && (
          <input
            type="hidden"
            name={lowerFormName}
            value={Math.min(range[0], range[1])}
          />
        )}

        {upperFormName && (
          <input
            type="hidden"
            name={upperFormName}
            value={Math.max(range[0], range[1])}
          />
        )}
      </div>
    </div>
  );
}

interface SliderThumbProps {
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  onMove: (clientX: number) => void;
  setValue: (value: number) => void;
  getTooltipText?: (value: number) => string;
}

function SliderThumb({
  value,
  min,
  max,
  step,
  disabled,
  onMove,
  setValue,
  getTooltipText,
}: SliderThumbProps) {
  const thumbDivRef = useRef<HTMLDivElement | null>(null);
  const popperRef = useRef<PopperRef | null>(null);

  useEffect(() => popperRef.current?.scheduleUpdate?.(), [value, min, max]);

  const handlePointerDown: React.PointerEventHandler = (e) =>
    !disabled && e.currentTarget.setPointerCapture(e.pointerId);

  const handlePointerUp: React.PointerEventHandler = (e) =>
    !disabled && e.currentTarget.releasePointerCapture(e.pointerId);

  const handlePointerMove: React.PointerEventHandler = (e) => {
    if (!disabled && e.currentTarget.hasPointerCapture(e.pointerId)) {
      onMove(e.clientX);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (disabled) {
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
        setValue(value - step);
        break;
      case 'ArrowRight':
        setValue(value + step);
        break;
      case 'Home':
        setValue(min);
        break;
      case 'End':
        setValue(max);
        break;
      case 'PageDown':
        setValue(value - step * 2);
        break;
      case 'PageUp':
        setValue(value + step * 2);
        break;
    }
  };

  return (
    <>
      <OverlayTrigger
        placement={'top'}
        trigger={['focus']}
        overlay={(props) => {
          popperRef.current = props.popper;
          return (
            <Tooltip {...props}>{getTooltipText?.(value) ?? value}</Tooltip>
          );
        }}
      >
        <div
          className="dual-range-thumb"
          tabIndex={disabled ? undefined : 0}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerMove={handlePointerMove}
          onKeyDown={handleKeyDown}
          draggable="false"
          ref={thumbDivRef}
          style={{
            position: 'absolute',
            boxSizing: 'border-box',
            left: `${percentage(value, min, max)}%`,
            top: '50%',
            width: 16,
            height: 16,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
          }}
        />
      </OverlayTrigger>

      {!disabled ? (
        <style>{`
        .dual-range-thumb {
            background: var(--bs-primary);
            transition: background-color 0.15s ease-in-out;
            cursor: grab;

            -webkit-touch-callout: none !important;
            -webkit-user-select: none !important;
            -webkit-user-drag: none !important;
            -khtml-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
        }

        .dual-range-thumb:focus {
            border-color: #0000ff;
            box-shadow: 0 0 0 5px rgba(0, 112, 243, 0.3);
        }

        .dual-range-thumb:focus-visible {
            outline: 1px solid #ffffff;
        }

        .dual-range-thumb:active {
            background: #99ccff;
            outline: 1px solid #ffffff;
        }
    `}</style>
      ) : (
        <style>{`
        .dual-range-thumb {
          background: var(--bs-gray-600);
        }
    `}</style>
      )}
    </>
  );
}
