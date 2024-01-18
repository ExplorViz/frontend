import Component from '@glimmer/component';

interface Args {
  onClick(): void;
}

export default class ResetButton extends Component<Args> {}
