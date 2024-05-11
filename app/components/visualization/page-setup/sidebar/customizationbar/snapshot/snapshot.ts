import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class VisualizationPageSetupSidebarCustomizationbarSnapshotSnapshotComponent extends Component {
  @tracked
  saveSnaphotBtnDisabled: boolean = true;

  @tracked
  snapshotName: string = '';

  @action
  canSaveSnapShot() {
    if (this.snapshotName !== '') {
      this.saveSnaphotBtnDisabled = false;
    } else {
      this.saveSnaphotBtnDisabled = true;
    }
  }

  @action
  updateName(event: InputEvent) {
    const target = event.target as HTMLInputElement;
    this.snapshotName = target.value;
    this.canSaveSnapShot();
  }

  @action
  saveSnapShot() {
    console.log('save snapshot:' + this.snapshotName);
  }

  @action
  exportSnapshot() {
    this.saveSnapShot();
    console.log('export snapshot:' + this.snapshotName);
  }
}
