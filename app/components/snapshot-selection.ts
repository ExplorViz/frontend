import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import SnapshotTokenService, {
  SnapshotToken,
} from 'explorviz-frontend/services/snapshot-token';

interface Args {
  tokens: SnapshotToken[];
  selectToken(token: SnapshotToken): void;
}

export default class SnapshotSelection extends Component<Args> {
  @service('snapshot-token')
  snapshotService!: SnapshotTokenService;

  @tracked
  sortPropertyPersonal: keyof SnapshotToken = 'createdAt';

  @tracked
  sortPropertyShared: keyof SnapshotToken = 'createdAt';

  @tracked
  sortOrderPersonal: 'asc' | 'desc' = 'asc';

  @tracked
  sortOrderShared: 'asc' | 'desc' = 'asc';

  @tracked
  uploadSnapshotMenu: boolean = false;

  @tracked
  uploadSnapshotBtnDisabled: boolean = true;

  @tracked
  name: string = '';

  @tracked
  file: File | null = null;

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
    this.file = null;
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
      this.file = target.files[0];
      this.canSaveSnapshot();
    }
  }

  @action
  canSaveSnapshot() {
    if (this.name !== '' && this.file !== null) {
      this.uploadSnapshotBtnDisabled = false;
    } else {
      this.uploadSnapshotBtnDisabled = true;
    }
  }

  @action
  async uploadSnapshot() {
    this.snapshotService.uploadSnapshot(this.file!, this.name);
    this.reset();
  }
}
