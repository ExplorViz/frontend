import Component from '@glimmer/component';
import { action } from '@ember/object';
import { useSnapshotTokenStore, TinySnapshot } from 'react-lib/src/stores/snapshot-token';

export default class DeleteSnapshotComponent extends Component<TinySnapshot> {
  @action
  async deleteSnapshot(
    snapShot: TinySnapshot,
    isShared: boolean,
    subscribed: boolean
  ) {
    useSnapshotTokenStore.getState().deleteSnapshot(snapShot, isShared, subscribed);
  }
}
