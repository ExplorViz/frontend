import Component from '@glimmer/component';
import { EvolutionLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/evolution-data';
import { action } from '@ember/object';

interface IArgs {
  evolutionData?: EvolutionLandscapeData;
  clicked?(application: string): void;
}

export default class ApplicationSelection extends Component<IArgs> {
  get evolutionData() {
    return this.args.evolutionData;
  }

  @action
  onClick(application: string) {
    this.args.clicked?.(application);
  }
}
