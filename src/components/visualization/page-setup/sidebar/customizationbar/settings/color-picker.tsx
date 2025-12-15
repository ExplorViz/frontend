import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import {
  ColorSetting,
  ColorSettingId,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { useEffect, useRef, useState } from 'react';
import { ColorResult, SketchPicker } from 'react-color';
import { Color } from 'three';

export default function ColorPicker({ id }: { id: ColorSettingId }) {
  const colorSetting = useUserSettingsStore.getState().visualizationSettings[
    id
  ] as ColorSetting;

  const [displayColorPicker, setDisplayColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState(colorSetting.value);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Update color when setting changes externally
  useEffect(() => {
    setCurrentColor(colorSetting.value);
  }, [colorSetting.value]);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target as Node)
      ) {
        setDisplayColorPicker(false);
      }
    };

    if (displayColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [displayColorPicker]);

  const handleColorChange = (color: ColorResult) => {
    const hexColor = color.hex;
    setCurrentColor(hexColor);

    useUserSettingsStore.getState().updateSetting(id, hexColor);
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

  const colorObject = new Color(currentColor);

  return (
    <div
      id={`cp-application-${id}`}
      className="setting-container input-group justify-content-between"
      ref={colorPickerRef}
    >
      <span className="colorpicker-label">
        {formatColorProperty(colorSetting.displayName)}
      </span>
      <span className="input-group-append colorpicker-input">
        <div className="colorpicker-wrapper">
          <span
            className="input-group-text colorpicker-input-addon"
            id={`cp-application-span${id}`}
            onClick={() => setDisplayColorPicker(!displayColorPicker)}
            style={{
              ['--colorpicker-color' as string]: colorObject.getStyle(),
            }}
          >
            <i></i>
          </span>
          {displayColorPicker && (
            <div className="colorpicker-popup">
              <SketchPicker
                color={currentColor}
                onChange={handleColorChange}
                disableAlpha
              />
            </div>
          )}
        </div>
      </span>
    </div>
  );
}

export type ExplorVizColors = Record<ColorSettingId, THREE.Color>;
