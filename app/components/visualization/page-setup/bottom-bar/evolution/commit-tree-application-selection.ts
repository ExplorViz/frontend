import Component from '@glimmer/component';

import { EvolutionLandscapeData } from 'explorviz-frontend/utils/evolution-schemes/evolution-data';

interface IArgs {
  applications: EvolutionLandscapeData;
  setSelectedApplication(application: string): void;
  selectedApplication: string;
}

export default class CommitTreeApplicationSelection extends Component<IArgs> {}
