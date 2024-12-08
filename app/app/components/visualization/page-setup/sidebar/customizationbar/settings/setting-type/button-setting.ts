import Component from '@glimmer/component';
import { ButtonSetting as ButtonSettingObj } from 'explorviz-frontend/utils/settings/settings-schemas';

interface Args {
  setting: ButtonSettingObj;
  onClick(): void;
}

export default class ButtonSetting extends Component<Args> {}
