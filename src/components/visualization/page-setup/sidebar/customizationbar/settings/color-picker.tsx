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

  top = Math.max(POPUP_MARGIN, Math.min(top, window.innerHeight - SKETCH_PICKER_HEIGHT - POPUP_MARGIN));
  left = Math.max(POPUP_MARGIN, Math.min(left, window.innerWidth - SKETCH_PICKER_WIDTH - POPUP_MARGIN));

  return { top, left };
}

interface ColorPickerProps {
  label: string;
  value?: string;
  initialValue?: string | null;
  onChange?(hexColor: string | null): void;
}

export default function ColorPicker({ label, value, initialValue, onChange }: ColorPickerProps) {
  const [selectedValue, setSelectedValue] = useState<string | null>(initialValue ?? null);
  const [displayColorPicker, setDisplayColorPicker] = useState(false);
  const [popupPosition, setPopupPosition] = useState<PopupPosition | null>(null);

  const colorPickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
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
      if (colorPickerRef.current?.contains(target) || popupRef.current?.contains(target)) {
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
            <SketchPicker color={value ?? selectedValue ?? COLOR_WHEN_NULL} onChange={handleColorChange} disableAlpha />
          </div>,
          document.body
        )
      : null;

  const handleResetClick = () => {
    setSelectedValue(initialValue!);
    onChange?.(initialValue!);
  };

  const isNoColorSelected = value === null || (value === undefined && selectedValue === null);

  return (
    <>
      <div className="setting-row" ref={colorPickerRef}>
        <div className="setting-label">
          <span>{label}</span>
        </div>
        <div className="setting-control">
          {initialValue !== undefined && <ResetButton onClick={handleResetClick} />}
          <button
            ref={triggerRef}
            type="button"
            className={`setting-swatch${isNoColorSelected ? ' crossed' : ''}`}
            title={`Pick ${label} color`}
            aria-label={`Pick ${label} color`}
            aria-expanded={displayColorPicker}
            style={{ backgroundColor: isNoColorSelected ? undefined : colorObject.getStyle() }}
            onClick={() => setDisplayColorPicker(!displayColorPicker)}
          />
        </div>
      </div>
      {popup}
    </>
  );
}

export type ExplorVizColors = Record<ColorSettingId, Color>;
