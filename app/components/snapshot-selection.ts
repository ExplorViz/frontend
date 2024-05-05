import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import Auth from 'explorviz-frontend/services/auth';
import { SnapshotToken } from 'explorviz-frontend/services/snapshot-token';

interface Args {
  tokens: SnapshotToken[];
  selectToken(token: SnapshotToken): void;
}

export default class SnapshotSelection extends Component<Args> {
  @service('auth')
  auth!: Auth;

  @tracked
  sortPropertyPersonal: keyof SnapshotToken = 'createdAt';

  @tracked
  sortPropertyShared: keyof SnapshotToken = 'createdAt';

  @tracked
  sortOrderPersonal: 'asc' | 'desc' = 'asc';

  @tracked
  sortOrderShared: 'asc' | 'desc' = 'asc';

  @action
  sortByPersonal(property: keyof SnapshotToken) {
    if (property === this.sortPropertyPersonal) {
      if (this.sortOrderPersonal === 'asc') {
        this.sortOrderPersonal = 'desc';
      } else {
        this.sortOrderPersonal = 'asc';
      }
    } else {
      this.sortOrderPersonal = 'asc';
      this.sortPropertyPersonal = property;
    }
  }

  @action
  sortByShared(property: keyof SnapshotToken) {
    if (property === this.sortPropertyShared) {
      if (this.sortOrderShared === 'asc') {
        this.sortOrderShared = 'desc';
      } else {
        this.sortOrderShared = 'asc';
      }
    } else {
      this.sortOrderShared = 'asc';
      this.sortPropertyShared = property;
    }
  }

  filter(snapShotTokens: SnapshotToken[], property: boolean) {
    return snapShotTokens.filter((token) => token.isShared === property);
  }

  // shoud be not used
  // @action
  // snapShotSelected() {
  //   console.log('snapShot selected');
  // }

  @action
  uploadSnapshot() {
    console.log('snapshot upload!');
  }
}
