import Component from '@glimmer/component';
import { ButtonSetting as ButtonSettingObj } from 'react-lib/src/utils/settings/settings-schemas';
import HelpTooltip from 'react-lib/src/components/help-tooltip.tsx';

interface Args {
  setting: ButtonSettingObj;
  onClick(): void;
}

export default class ButtonSetting extends Component<Args> {
  helpTooltipComponent = HelpTooltip;
}
