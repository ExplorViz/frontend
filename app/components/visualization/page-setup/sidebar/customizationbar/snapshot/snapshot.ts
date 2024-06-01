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
import LocalUser from 'collaboration/services/local-user';

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

  @service('local-user')
  localUser!: LocalUser;

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
    const saveRoom = this.roomSerializer.serializeRoom(
      this.args.popUpData,
      true
    );

    const fov = this.localUser.defaultCamera.fov;
    const apsect = this.localUser.defaultCamera.aspect;
    const near = this.localUser.defaultCamera.near;
    const far = this.localUser.defaultCamera.far;

    const left = this.localUser.orthographicCamera.left;
    const right = this.localUser.orthographicCamera.right;
    const top = this.localUser.orthographicCamera.top;
    const bottom = this.localUser.orthographicCamera.bottom;
    const orthoFar = this.localUser.orthographicCamera.far;
    const orthoNear = this.localUser.orthographicCamera.near;

    const camera = {
      defaultCamera: { fov: fov, aspect: apsect, near: near, far: far },
      orthographicCamera: {
        left: left,
        right: right,
        top: top,
        bottom: bottom,
        far: orthoFar,
        near: orthoNear,
      },
    };

    const content: SnapshotToken = {
      owner: this.auth.user!.sub,
      createdAt: createdAt,
      name: this.snapshotName,
      landscapeToken: this.args.landscapeToken,
      structureData: {
        structureLandscapeData: this.args.landscapeData.structureLandscapeData,
        dynamicLandscapeData: this.args.landscapeData.dynamicLandscapeData,
      },
      serializedRoom: saveRoom,
      configuration: {},
      camera: camera,
      annotations: {},
      isShared: false,
      deleteAt: 0,
    };

    this.snapshotService.saveSnapshot(content);
    this.reset();
  }

  @action
  exportSnapshot() {
    const createdAt: number = new Date().getTime();
    const saveRoom = this.roomSerializer.serializeRoom(
      this.args.popUpData,
      true
    );

    const fov = this.localUser.defaultCamera.fov;
    const apsect = this.localUser.defaultCamera.aspect;
    const near = this.localUser.defaultCamera.near;
    const far = this.localUser.defaultCamera.far;

    const left = this.localUser.orthographicCamera.left;
    const right = this.localUser.orthographicCamera.right;
    const top = this.localUser.orthographicCamera.top;
    const bottom = this.localUser.orthographicCamera.bottom;
    const orthoFar = this.localUser.orthographicCamera.far;
    const orthoNear = this.localUser.orthographicCamera.near;

    const camera = {
      defaultCamera: { fov: fov, aspect: apsect, near: near, far: far },
      orthographicCamera: {
        left: left,
        right: right,
        top: top,
        bottom: bottom,
        far: orthoFar,
        near: orthoNear,
      },
    };

    const content: SnapshotToken = {
      owner: this.auth.user!.sub,
      createdAt: createdAt,
      name: this.snapshotName,
      landscapeToken: this.args.landscapeToken,
      structureData: {
        structureLandscapeData: this.args.landscapeData.structureLandscapeData,
        dynamicLandscapeData: this.args.landscapeData.dynamicLandscapeData,
      },
      serializedRoom: saveRoom,
      configuration: {},
      camera: camera,
      annotations: {},
      isShared: false,
      deleteAt: 0,
    };
    this.snapshotService.exportFile(content);
    this.reset();
  }

  reset() {
    this.snapshotName = '';
    this.saveSnaphotBtnDisabled = true;
  }
}
