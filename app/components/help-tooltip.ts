import Component from '@glimmer/component';

interface Args {
  placement: string | undefined;
}

export default class HelpTooltip extends Component<Args> {
  get placement() {
    return this.args.placement ?? 'left';
  }
}
