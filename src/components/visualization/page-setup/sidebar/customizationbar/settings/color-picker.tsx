import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import {
  ColorSetting,
  ColorSettingId,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ColorResult, SketchPicker } from 'react-color';
import { Color } from 'three';

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

export default function ColorPicker({
  id,
  label,
}: {
  id: ColorSettingId;
  label?: string;
}) {
  const colorSetting = useUserSettingsStore(
    (state) => state.visualizationSettings[id] as ColorSetting
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
    useUserSettingsStore.getState().updateSetting(id, color.hex);
  };

  const formatColorProperty = (displayName: string) => {
    if (displayName.length > 0) {
      displayName = displayName.replace(
        /[A-Z]/g,
        (upperCaseLetter) => ` ${upperCaseLetter}`
      );
      displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    } else {
      displayName = '';
    }

    return displayName;
  };

  const colorObject = new Color(colorSetting.value);

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
              color={colorSetting.value}
              onChange={handleColorChange}
              disableAlpha
            />
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        id={`cp-application-${id}`}
        className="setting-container input-group justify-content-between"
        ref={colorPickerRef}
      >
        <span className="colorpicker-label">
          {label ?? formatColorProperty(colorSetting.displayName)}
        </span>
        <span className="input-group-append colorpicker-input">
          <div className="colorpicker-wrapper">
            <span
              ref={triggerRef}
              className="input-group-text colorpicker-input-addon"
              id={`cp-application-span${id}`}
              onClick={() => setDisplayColorPicker(!displayColorPicker)}
              style={{
                ['--colorpicker-color' as string]: colorObject.getStyle(),
              }}
            >
              <i></i>
            </span>
          </div>
        </span>
      </div>
      {popup}
    </>
  );
}

export type ExplorVizColors = Record<ColorSettingId, Color>;
