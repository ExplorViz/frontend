import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import RoomSerializer from 'collaboration/services/room-serializer';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import PopupData from 'explorviz-frontend/components/visualization/rendering/popups/popup-data';
import ENV from 'explorviz-frontend/config/environment';
import Auth from 'explorviz-frontend/services/auth';
import { SnapshotToken } from 'explorviz-frontend/services/snapshot-token';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import { LandscapeToken } from 'explorviz-frontend/services/landscape-token';

interface Args {
  landscapeData: LandscapeData;
  // unnötig da in serializedRoom
  popUpData: PopupData;
  // unnötig da in serializedRoom
  landscapeToken: LandscapeToken;
}

const { userServiceApi } = ENV.backendAddresses;

export default class VisualizationPageSetupSidebarCustomizationbarSnapshotSnapshotComponent extends Component<Args> {
  @service('auth')
  auth!: Auth;

  @service('room-serializer')
  roomSerializer!: RoomSerializer;

  @service('toast-handler')
  toastHandler!: ToastHandlerService;

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
    const target: HTMLInputElement = event.target as HTMLInputElement;
    this.snapshotName = target.value;
    this.canSaveSnapShot();
  }

  @action
  async saveSnapShot() {
    const createdAt: number = new Date().getTime();
    const saveRoom = this.roomSerializer.serializeRoom();
    // console.log(this.args.landscapeToken);
    console.log(this.args.landscapeData);
    // console.log(this.args.popUpData);

    const content: SnapshotToken = {
      owner: this.auth.user!.sub,
      createdAt: createdAt,
      name: this.snapshotName,
      landscapeToken: {
        alias: 'string',
        created: 2,
        ownerId: 'string',

        sharedUsersIds: [],
        value: 'string',
      },
      structureData: {},
      configuration: {},
      camera: {},
      annotations: {},
      isShared: false,
      deleteAt: 0,
      julius: saveRoom,
    };

    const url = `${userServiceApi}/snapshot/create`;
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify(content),
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    })
      .then(async (response: Response) => {
        if (response.ok) {
          this.toastHandler.showSuccessToastMessage(
            'Successfully saved snapshot.'
          );
        } else if (response.status === 422) {
          this.toastHandler.showErrorToastMessage('Snapshot already exists.');
        } else {
          this.toastHandler.showErrorToastMessage(
            'Something went wrong. Snapshot could not be saved.'
          );
        }
      })
      .catch(async () => {
        this.toastHandler.showErrorToastMessage('Server could not be reached.');
      });

    // // hier noch toasthandler für success und so
    // //const saveRoom = this.roomSerializer.serializeRoom();
    // console.log('save snapshot:' + this.snapshotName);
    // console.log(saveRoom);
    // console.log(this.args.landscapeData);
    // console.log(this.args.popUpData);
  }

  async exportFile(exportData: any) {
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
      JSON.stringify(exportData)
    )}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = 'data.viz';

    link.click();
  }

  @action
  exportSnapshot() {
    // hier noch toasthandler für success und so
    this.saveSnapShot();
    this.exportFile({ name: this.snapshotName });
    console.log('export snapshot:' + this.snapshotName);
  }
}
