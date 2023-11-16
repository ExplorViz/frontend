import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { SelectedCommit } from 'explorviz-frontend/controllers/visualization';
import { ApplicationCommunication } from 'explorviz-frontend/utils/landscape-rendering/application-communication-computer';


export interface CommitComparison {
    firstCommitSelected: SelectedCommit;
    secondCommitSelected: SelectedCommit;
    orderedCommits: boolean;
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

  //@tracked
  //communications: ApplicationCommunication[] = [];

  getById(id: string) {
    return this.commitComparisons.get(id);
  }

  add(commitComparison: CommitComparison) {
    const idList = [commitComparison.firstCommitSelected.commitId, commitComparison.secondCommitSelected.commitId];
    if(commitComparison.orderedCommits){ // for ordered commits (i.e. commits that are within a chain of branches) we should always compare by starting from the viewpoint of the older commit
        this.commitComparisons.set(idList[0] + "_" + idList[1], commitComparison);
        this.commitComparisons.set(idList[1] + "_" + idList[0], commitComparison);
    }else {
        this.commitComparisons.set(idList[0] + "_" + idList[1], commitComparison);
    }
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
