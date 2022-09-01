import { action } from '@ember/object';
import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import Configuration, { ApplicationColors, LandscapeColors } from 'explorviz-frontend/services/configuration';
import UserSettings from 'explorviz-frontend/services/user-settings';
import isObject from 'explorviz-frontend/utils/object-helpers';
import { ApplicationColorSettingId, ColorSetting, LandscapeColorSettingId } from 'explorviz-frontend/utils/settings/settings-schemas';

interface Args {
  id: ApplicationColorSettingId | LandscapeColorSettingId;
  setting: ColorSetting;
  updateColors(): void;
}

interface ColorPickerObjectApplication {
  colorObject: THREE.Color;
  colorName: keyof ApplicationColors;
  isApplicationObject: true;
}

interface ColorPickerObjectLandscape {
  colorObject: THREE.Color;
  colorName: keyof LandscapeColors;
  isLandscapeObject: true;
}

export default class ColorPicker extends Component<Args> {
  @service('configuration')
  configuration!: Configuration;

  @service('user-settings')
  userSettings!: UserSettings;

  @action
  setupLandscapeColorpicker(colorName: keyof LandscapeColors, element: HTMLElement) {
    const colorObject = this.configuration.landscapeColors[colorName];
    this.setupColorpicker(element, {
      colorObject,
      colorName,
      isLandscapeObject: true,
    });
  }

  @action
  setupApplicationColorpicker(colorName: keyof ApplicationColors, element: HTMLElement) {
    const colorObject = this.configuration.applicationColors[colorName];
    this.setupColorpicker(element, {
      colorObject,
      colorName,
      isApplicationObject: true,
    });
  }

  /**
   * Initilizes a given colorpicker element with a passed color.
   * Additionally, the color update event is handled.
   *
   * @param element The HTML colorpicker element
   * @param configColor Reference to the respective color in the configuration service
   */
  setupColorpicker(element: HTMLElement,
    colorPickerObject: ColorPickerObjectApplication | ColorPickerObjectLandscape) {
    // eslint-disable-next-line
    $(`#${element.id}`)
    // @ts-ignore
      .colorpicker(
        {
          color: colorPickerObject.colorObject.getHexString(),
          format: 'hex',
          useAlpha: false,
        },
      ).on('colorpickerChange', (e: any) => {
        const inputColor = e.color.toHexString();
        colorPickerObject.colorObject.set(inputColor);

        if (ColorPicker.isLandscapeObject(colorPickerObject)) {
          this.userSettings.updateLandscapeSetting(colorPickerObject.colorName, inputColor);
        } else {
          this.userSettings.updateApplicationSetting(colorPickerObject.colorName, inputColor);
        }

        this.args.updateColors();
      });
  }

  private static isLandscapeObject(object: unknown): object is ColorPickerObjectLandscape {
    return isObject(object) && {}.hasOwnProperty.call(object, 'isLandscapeObject');
  }
}
