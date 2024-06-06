import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import SnapshotTokenService, {
  TinySnapshot,
} from 'explorviz-frontend/services/snapshot-token';

export default class DeleteSnapshotComponent extends Component<TinySnapshot> {
  @service('snapshot-token')
  snapshotService!: SnapshotTokenService;

  @action
  async deleteSnapshot(
    snapShot: TinySnapshot,
    isShared: boolean,
    subscribed: boolean
  ) {
    this.snapshotService.deleteSnapshot(snapShot, isShared, subscribed);
  }
}
