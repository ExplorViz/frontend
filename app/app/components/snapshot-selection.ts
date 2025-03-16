import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { useSnapshotTokenStore, SnapshotToken } from 'react-lib/src/stores/snapshot-token';
import ENV from 'explorviz-frontend/config/environment';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';

interface Args {
  tokens: SnapshotToken[];
  selectToken(token: SnapshotToken): void;
}

const { shareSnapshot } = ENV.backendAddresses;

export default class SnapshotSelection extends Component<Args> {
  @tracked
  sortPropertyPersonal: keyof SnapshotToken = 'createdAt';

  @tracked
  sortPropertyShared: keyof SnapshotToken = 'createdAt';

  @tracked
  sortOrderPersonal: 'asc' | 'desc' = 'desc';

  @tracked
  sortOrderShared: 'asc' | 'desc' = 'desc';

  @tracked
  uploadSnapshotMenu: boolean = false;

  @tracked
  uploadSnapshotBtnDisabled: boolean = true;

  @tracked
  displayName: boolean = false;

  @tracked
  snapshotData: SnapshotToken | null = null;

  @tracked
  name: string = '';

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

  @action
  openMenu() {
    this.uploadSnapshotMenu = true;
  }

  @action
  closeMenu() {
    this.uploadSnapshotMenu = false;
    this.reset();
  }

  @action
  reset() {
    this.uploadSnapshotMenu = false;
    this.name = '';
    this.snapshotData = null;
    this.displayName = false;
  }

  @action
  updateName(event: InputEvent) {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    this.name = target.value;
    this.canSaveSnapshot();
  }

  @action
  updateFile(event: InputEvent) {
    const target = event.target as HTMLInputElement;
    if (target.files !== null) {
      const fileReader = new FileReader();

      fileReader.onload = () => {
        const fileContent = fileReader.result as string;
        const jsonData = JSON.parse(fileContent);
        this.snapshotData = jsonData as SnapshotToken;
        this.name = this.snapshotData.name;
        this.displayName = true;
        this.canSaveSnapshot();
      };

      fileReader.readAsText(target.files[0]);
    }
  }

  @action
  canSaveSnapshot() {
    if (this.name !== '' && this.snapshotData !== null) {
      this.uploadSnapshotBtnDisabled = false;
    } else {
      this.uploadSnapshotBtnDisabled = true;
    }
  }

  @action
  async uploadSnapshot() {
    useSnapshotTokenStore.getState().saveSnapshot(this.snapshotData!, this.name);
    this.reset();
  }

  @action
  async createLink(snapshot: SnapshotToken) {
    try {
      await navigator.clipboard.writeText(
        `${shareSnapshot}visualization?landscapeToken=${snapshot.landscapeToken.value}&owner=${snapshot.owner}&createdAt=${snapshot.createdAt}&sharedSnapshot=${true}`
      );
      useToastHandlerStore
        .getState()
        .showSuccessToastMessage('Snapshot URL copied to clipboard.');
    } catch (e) {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage('Failed to generate URL for snapshot.');
    }
  }
}
