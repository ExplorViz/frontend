import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import SnapshotTokenService, {
  SnapshotToken,
} from 'explorviz-frontend/services/snapshot-token';

export default class DeleteSnapshotComponent extends Component<SnapshotToken> {
  @service('snapshot-token')
  snapshotService!: SnapshotTokenService;

  @action
  async deleteSnapshot(snapShot: SnapshotToken) {
    this.snapshotService.deleteSnapshot(snapShot);
  }
}
