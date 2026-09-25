import { ColorSettingId } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ColorResult, SketchPicker } from 'react-color';
import { createPortal } from 'react-dom';
import { Color } from 'three';
import ResetButton from './setting-type/reset-button';

const COLOR_WHEN_NULL = '#ffffff';
const SKETCH_PICKER_WIDTH = 220;
const SKETCH_PICKER_HEIGHT = 320;
const POPUP_MARGIN = 8;

type PopupPosition = {
  top: number;
  left: number;
};

function computePopupPosition(trigger: HTMLElement): PopupPosition {
  const rect = trigger.getBoundingClientRect();
  let top = rect.bottom + 4;
  let left = rect.right - SKETCH_PICKER_WIDTH;

  if (top + SKETCH_PICKER_HEIGHT + POPUP_MARGIN > window.innerHeight) {
    top = rect.top - SKETCH_PICKER_HEIGHT - 4;
  }

  top = Math.max(
    POPUP_MARGIN,
    Math.min(top, window.innerHeight - SKETCH_PICKER_HEIGHT - POPUP_MARGIN)
  );
  left = Math.max(
    POPUP_MARGIN,
    Math.min(left, window.innerWidth - SKETCH_PICKER_WIDTH - POPUP_MARGIN)
  );

  return { top, left };
}

interface ColorPickerProps {
  label: string;
  value?: string;
  initialValue?: string | null;
  onChange?(hexColor: string | null): void;
}

export default function ColorPicker({
  label,
  value,
  initialValue,
  onChange,
}: ColorPickerProps) {
  const [selectedValue, setSelectedValue] = useState<string | null>(
    initialValue ?? null
  );
  const [displayColorPicker, setDisplayColorPicker] = useState(false);
  const [popupPosition, setPopupPosition] = useState<PopupPosition | null>(
    null
  );

  const colorPickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!displayColorPicker || !triggerRef.current) {
      setPopupPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current) {
        return;
      }
      setPopupPosition(computePopupPosition(triggerRef.current));
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
    };
  }, [displayColorPicker]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        colorPickerRef.current?.contains(target) ||
        popupRef.current?.contains(target)
      ) {
        return;
      }
      setDisplayColorPicker(false);
    };

    if (displayColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [displayColorPicker]);

  useEffect(() => {
    if (!displayColorPicker) {
      return;
    }

    const closeOnScroll = () => {
      setDisplayColorPicker(false);
    };

    window.addEventListener('scroll', closeOnScroll, true);
    return () => {
      window.removeEventListener('scroll', closeOnScroll, true);
    };
  }, [displayColorPicker]);

  const handleColorChange = (color: ColorResult) => {
    setSelectedValue(color.hex);
    onChange?.(color.hex);
  };

  const colorObject = new Color(value ?? selectedValue ?? COLOR_WHEN_NULL);

  const popup =
    displayColorPicker && popupPosition
      ? createPortal(
          <div
            ref={popupRef}
            className="colorpicker-popup colorpicker-popup--portal"
            style={{
              top: popupPosition.top,
              left: popupPosition.left,
            }}
          >
            <SketchPicker
              color={value ?? selectedValue ?? COLOR_WHEN_NULL}
              onChange={handleColorChange}
              disableAlpha
            />
          </div>,
          document.body
        )
      : null;

  const handleResetClick = () => {
    setSelectedValue(initialValue!);
    onChange?.(initialValue!);
  };

  const isNoColorSelected =
    value === null || (value === undefined && selectedValue === null);

  return (
    <>
      <div
        className="setting-container input-group justify-content-between"
        ref={colorPickerRef}
      >
        <span className="colorpicker-label">{label}</span>
        <div className="d-flex align-items-center gap-2">
          <span className="input-group-append colorpicker-input">
            <div className="colorpicker-wrapper">
              <span
                ref={triggerRef}
                className={`input-group-text colorpicker-input-addon overflow-hidden ${isNoColorSelected ? 'crossed' : ''}`}
                onClick={() => setDisplayColorPicker(!displayColorPicker)}
                style={{
                  ['--colorpicker-color' as string]: colorObject.getStyle(),
                }}
              >
                <i></i>
              </span>

              {/* Show red diagonal across box if no value is selected */}
              <style>
                {`
                  .crossed::after {
                    content: "";
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: 100%;
                    height: 2px;
                    background: red;
                    transform: translate(-50%, -50%) rotate(-45deg);
                    overflow: hidden;
                  }
                `}
              </style>
            </div>
          </span>
          {initialValue !== undefined && (
            <ResetButton onClick={handleResetClick} />
          )}
        </div>
      </div>
      {popup}
    </>
  );
}

export type ExplorVizColors = Record<ColorSettingId, Color>;
