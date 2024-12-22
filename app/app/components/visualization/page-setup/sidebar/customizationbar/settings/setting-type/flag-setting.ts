import Component from '@glimmer/component';
import { FlagSetting as FlagSettingObject } from 'react-lib/src/utils/settings/settings-schemas';

interface Args {
  setting: FlagSettingObject;
  onChange(value: boolean): void;
}

export default class FlagSetting extends Component<Args> {}
