import Component from '@glimmer/component';

import { EvolutedApplication } from 'explorviz-frontend/utils/evolution-schemes/evolution-data';

interface IArgs {
  applications: EvolutedApplication[];
  setSelectedApplication(application: string): void;
  selectedApplication: string;
}

export default class CommitTreeApplicationSelection extends Component<IArgs> {}
