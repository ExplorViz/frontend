import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { SelectedCommit } from 'explorviz-frontend/controllers/visualization';
import { ApplicationCommunication } from 'explorviz-frontend/utils/landscape-rendering/application-communication-computer';


export interface CommitComparison {
    firstCommit: SelectedCommit;
    secondCommit: SelectedCommit;
    modified: string[]; // the component id's from the components of the first commit that got modified in the second commit
    added: string[]; // the component id's from the second commit components that are missing in the first commit
    missing: string[]; // the component id's from the first commit components that are missing in the second commit
    deleted: string[]; // the component id's from the first commit components that got deleted in the second commit
}

export default class CommitComparisonRepository extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  //@tracked
  commitComparisons: Map<string, CommitComparison> = new Map<
    string,
    CommitComparison
  >();

  @tracked
  communications: ApplicationCommunication[] = [];

  getById(id: string) {
    return this.commitComparisons.get(id);
  }

  add(commitComparison: CommitComparison) {
    const idList = [commitComparison.firstCommit.commitId, commitComparison.secondCommit.commitId];
    idList.sort();
    const id = idList.join("_");
    this.commitComparisons.set(id, commitComparison);
    //this.notifyPropertyChange('commitComparisons');
  }



  cleanup() {
    this.commitComparisons.clear();
    //this.notifyPropertyChange('applications');
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'repos/commit-comparison-repository': CommitComparisonRepository;
  }
}
