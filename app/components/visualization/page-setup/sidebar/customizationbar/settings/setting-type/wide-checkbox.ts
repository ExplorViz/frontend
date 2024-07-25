import Component from '@glimmer/component';

interface Args {
  value: boolean;
  onToggle(value: boolean): void;
}

export default class WideCheckbox extends Component<Args> {}
