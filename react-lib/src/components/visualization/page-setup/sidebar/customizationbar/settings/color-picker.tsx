import React from 'react';
import { useEffect, useRef } from 'react';
import Picker from 'vanilla-picker';
import { useUserSettingsStore } from 'react-lib/src/stores/user-settings';
import { ColorSettingId } from 'react-lib/src/utils/settings/settings-schemas';

export default function ColorPicker({
  id,
  setting,
  updateColors,
}: {
  id: ColorSettingId; // ColorSettingId
  setting: any; // ColorSetting
  updateColors(): void;
}) {
  const colorPickerRef: React.MutableRefObject<any> = useRef(null);

  useEffect(() => {
    setupApplicationColorpicker(id, colorPickerRef);
  }, []);

  const setupApplicationColorpicker = (
    colorName: keyof ExplorVizColors,
    element: any // HTMLElement
  ) => {
    const colorObject = useUserSettingsStore.getState().colors![colorName];
    setupColorpicker(element.current, {
      colorObject,
      colorName,
    });
  };

  /**
   * Initilizes a given colorpicker element with a passed color.
   * Additionally, the color update event is handled.
   *
   * @param element The HTML colorpicker element
   * @param configColor Reference to the respective color in the configuration service
   */
  const setupColorpicker = (
    element: HTMLElement,
    colorPickerObject: ColorPickerObjectApplication
  ) => {
    // eslint-disable-next-line
    const picker = new Picker(element);

    element.style.background = colorPickerObject.colorObject.getStyle();

    picker.setOptions({
      popup: 'left',
      color: colorPickerObject.colorObject.getHexString(),
      alpha: false,
    });

    picker.onChange = (color) => {
      element.style.background = color.rgbaString;
      const inputColor = color.hex.substring(0, 7);

      colorPickerObject.colorObject.set(inputColor);
      useUserSettingsStore
        .getState()
        .updateSetting(colorPickerObject.colorName, inputColor);
      updateColors();
    };
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

  return (
    <div
      id={`cp-application-${id}`}
      className="setting-container input-group justify-content-between"
    >
      <span className="colorpicker-label">
        {formatColorProperty(setting.displayName)}
      </span>
      <span className="input-group-append colorpicker-input">
        <span
          className="input-group-text colorpicker-input-addon"
          id={`cp-application-span${id}`}
          ref={colorPickerRef}
        >
          <i></i>
        </span>
      </span>
    </div>
  );
}

interface ColorPickerObjectApplication {
  colorObject: THREE.Color;
  colorName: keyof ExplorVizColors;
}

export type ExplorVizColors = Record<ColorSettingId, THREE.Color>;
