import { action } from '@ember/object';
import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import UserSettings, {
  ApplicationColors,
} from 'explorviz-frontend/services/user-settings';
import {
  ApplicationColorSettingId,
  ColorSetting,
} from 'some-react-lib/src/utils/settings/settings-schemas';
import Picker from 'vanilla-picker';

interface Args {
  id: ApplicationColorSettingId;
  setting: ColorSetting;
  updateColors(): void;
}

interface ColorPickerObjectApplication {
  colorObject: THREE.Color;
  colorName: keyof ApplicationColors;
}

export default class ColorPicker extends Component<Args> {
  @service('user-settings')
  userSettings!: UserSettings;

  @action
  setupApplicationColorpicker(
    colorName: keyof ApplicationColors,
    element: HTMLElement
  ) {
    const colorObject = this.userSettings.applicationColors[colorName];
    this.setupColorpicker(element, {
      colorObject,
      colorName,
    });
  }

  /**
   * Initilizes a given colorpicker element with a passed color.
   * Additionally, the color update event is handled.
   *
   * @param element The HTML colorpicker element
   * @param configColor Reference to the respective color in the configuration service
   */
  setupColorpicker(
    element: HTMLElement,
    colorPickerObject: ColorPickerObjectApplication
  ) {
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
      this.userSettings.updateApplicationSetting(
        colorPickerObject.colorName,
        inputColor
      );
      this.args.updateColors();
    };
  }
}
