import Component from '@glimmer/component';
import { action } from '@ember/object';
import { useSnapshotTokenStore, TinySnapshot } from 'react-lib/src/stores/snapshot-token';
import { tracked } from '@glimmer/tracking';
import convertDate from 'react-lib/src/utils/helpers/time-convter';

export default class ShareSnapshotComponent extends Component<TinySnapshot> {
  @tracked
  setExpireDateMenu: boolean = false;

  @tracked
  expDate: number | null = null;

  @action
  openMenu() {
    this.setExpireDateMenu = true;
  }

  @action
  closeMenu() {
    this.setExpireDateMenu = false;
    this.expDate = null;
  }

  @action
  updateExpDate(event: InputEvent) {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    const date = convertDate(target.value);
    this.expDate = date;
  }

  @action
  async shareSnapshot(snapshot: TinySnapshot) {
    const expDate = this.expDate !== null ? this.expDate : 0;

    useSnapshotTokenStore.getState().shareSnapshot(snapshot, expDate);
  }
}
