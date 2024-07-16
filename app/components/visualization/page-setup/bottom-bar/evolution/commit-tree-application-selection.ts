import Component from '@glimmer/component';

import { AppNameCommitTreeMap } from 'explorviz-frontend/utils/evolution-schemes/evolution-data';

interface IArgs {
  appNameCommitTreeMap: AppNameCommitTreeMap;
  setSelectedApplication(application: string): void;
  selectedApplication: string;
}

export default class CommitTreeApplicationSelection extends Component<IArgs> {}
