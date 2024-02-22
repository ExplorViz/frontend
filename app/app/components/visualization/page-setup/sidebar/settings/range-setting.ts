import Component from '@glimmer/component';
import { RangeSetting as RangeSettingObject } from 'some-react-lib/src/utils/settings/settings-schemas';

interface Args {
  setting: RangeSettingObject;
  onChange(value: number): void;
}

export default class RangeSetting extends Component<Args> { }
