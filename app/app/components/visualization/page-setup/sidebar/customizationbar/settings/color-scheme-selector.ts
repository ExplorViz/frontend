import Component from '@glimmer/component';
import { ColorSchemeId } from 'react-lib/src/utils/settings/color-schemes';

interface Args {
  colorSchemes: { name: string; action: () => void };
  applyColorScheme(colorScheme: ColorSchemeId): void;
}

export default class ColorSchemeSelector extends Component<Args> {}
