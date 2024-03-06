import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { SelectedCommit } from 'explorviz-frontend/controllers/visualization';
import { inject as service } from '@ember/service';
import { ApplicationCommunication } from 'explorviz-frontend/utils/landscape-rendering/application-communication-computer';
import ApplicationRenderer from '../application-renderer';
import Evented from '@ember/object/evented';

export interface CommitComparison {
  firstCommitSelected: SelectedCommit;
  secondCommitSelected: SelectedCommit;
  modified: string[]; // the component id's from the components of the first commit that got modified in the second commit
  added: string[]; // the component id's from the second commit components that are missing in the first commit
  deleted: string[]; // the component id's from the first commit components that got deleted in the second commit
  addedPackages: string[];
  deletedPackages: string[];
  metrics: {
    entityName: string;
    metricMap: {
      LCOM4:
        | {
            oldValue: string | null;
            newValue: string;
          }
        | undefined;
      cyclomatic_complexity:
        | {
            oldValue: string | null;
            newValue: string;
          }
        | undefined;
      cyclomatic_complexity_weighted:
        | {
            oldValue: string | null;
            newValue: string;
          }
        | undefined;
      loc:
        | {
            // used to identify which communication line needs to be marked as modified
            // during the commit comparison
            oldValue: string | null;
            newValue: string;
          }
        | undefined;
    };
  }[];
}

export default class CommitComparisonRepository extends Service.extend(
  Evented
) {
  @tracked
  commitComparisons: Map<string, CommitComparison> = new Map<
    string,
    CommitComparison
  >();

  getById(id: string) {
    return this.commitComparisons.get(id);
  }

  add(commitComparison: CommitComparison) {
    const idList = [
      commitComparison.firstCommitSelected.commitId,
      commitComparison.secondCommitSelected.commitId,
    ];
    this.commitComparisons.set(idList[0] + '_' + idList[1], commitComparison);
    this.notifyPropertyChange('commitComparisons');
  }

  cleanup() {
    this.commitComparisons.clear();
    this.notifyPropertyChange('commitComparisons');
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'repos/commit-comparison-repository': CommitComparisonRepository;
  }
}
