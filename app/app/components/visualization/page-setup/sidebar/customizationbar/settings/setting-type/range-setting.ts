import Component from '@glimmer/component';
import { RangeSetting as RangeSettingObject } from 'react-lib/src/utils/settings/settings-schemas';
import HelpTooltip from 'react-lib/src/components/help-tooltip.tsx';

interface Args {
  setting: RangeSettingObject;
  onChange(value: number): void;
}

export default class RangeSetting extends Component<Args> {
  helpTooltipComponent = HelpTooltip;
}
