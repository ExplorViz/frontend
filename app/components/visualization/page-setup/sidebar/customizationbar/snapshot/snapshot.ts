import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import RoomSerializer from 'collaboration/services/room-serializer';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import PopupData from 'explorviz-frontend/components/visualization/rendering/popups/popup-data';
import Auth from 'explorviz-frontend/services/auth';
import SnapshotTokenService, {
  SnapshotToken,
} from 'explorviz-frontend/services/snapshot-token';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import { LandscapeToken } from 'explorviz-frontend/services/landscape-token';

interface Args {
  landscapeData: LandscapeData;
  // unnötig da in serializedRoom
  popUpData: PopupData[];
  // unnötig da in serializedRoom
  landscapeToken: LandscapeToken;
}

export default class VisualizationPageSetupSidebarCustomizationbarSnapshotSnapshotComponent extends Component<Args> {
  @service('auth')
  auth!: Auth;

  @service('room-serializer')
  roomSerializer!: RoomSerializer;

  @service('snapshot-token')
  snapshotService!: SnapshotTokenService;

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
  async saveSnapshot() {
    const createdAt: number = new Date().getTime();
    const saveRoom = this.roomSerializer.serializeRoom(this.args.popUpData);
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

    this.snapshotService.saveSnapshot(content);
    this.reset();
  }

  @action
  exportSnapshot() {
    // hier noch toasthandler für success und so

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
    // überhaupt speichern? Nicht doppelt gemoppelt?
    //this.snapshotService.saveSnapshot(content);
    this.snapshotService.exportFile(content);
    this.reset();
  }

  reset() {
    this.snapshotName = '';
    this.saveSnaphotBtnDisabled = true;
  }
}
