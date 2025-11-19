import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import {
  ColorSetting,
  ColorSettingId,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';
import React, { useEffect, useRef } from 'react';
import { Color } from 'three';
import Picker from 'vanilla-picker';

export default function ColorPicker({ id }: { id: ColorSettingId }) {
  const colorSetting = useUserSettingsStore.getState().visualizationSettings[
    id
  ] as ColorSetting;

  const colorPickerRef: React.RefObject<any> = useRef(null);

  useEffect(() => {
    setupApplicationColorpicker(id, colorPickerRef);
  }, [colorSetting.value]);

  const setupApplicationColorpicker = (
    colorName: keyof ExplorVizColors,
    element: any // HTMLElement
  ) => {
    const colorObject = new Color(
      useUserSettingsStore.getState().visualizationSettings[colorName].value
    );
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

    picker.onChange = (color: any) => {
      element.style.background = color.rgbaString;
      const inputColor = color.hex.substring(0, 7);

      colorPickerObject.colorObject.set(inputColor);
      useUserSettingsStore
        .getState()
        .updateSetting(colorPickerObject.colorName, inputColor);
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
        {formatColorProperty(colorSetting.displayName)}
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
