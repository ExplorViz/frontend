import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import RoomSerializer from 'explorviz-frontend/services/collaboration/room-serializer';
import PopupData from 'react-lib/src/components/visualization/rendering/popups/popup-data';
import SnapshotTokenService, {
  SnapshotToken,
} from 'explorviz-frontend/services/snapshot-token';
import { LandscapeToken } from 'explorviz-frontend/services/landscape-token';
import AnnotationData from 'explorviz-frontend/components/visualization/rendering/annotations/annotation-data';
import LocalUser from 'explorviz-frontend/services/collaboration/local-user';
import TimestampRepository from 'explorviz-frontend/services/repos/timestamp-repository';
import { LandscapeData } from 'react-lib/src/utils/landscape-schemes/landscape-data';
import { useAuthStore } from 'react-lib/src/stores/auth';

interface Args {
  landscapeData: LandscapeData;
  popUpData: PopupData[];
  landscapeToken: LandscapeToken;
  annotationData: AnnotationData[];
  minimizedAnnotations: AnnotationData[];
}

export default class VisualizationPageSetupSidebarCustomizationbarSnapshotSnapshotComponent extends Component<Args> {
  @service('collaboration/room-serializer')
  roomSerializer!: RoomSerializer;

  @service('snapshot-token')
  snapshotService!: SnapshotTokenService;

  @service('collaboration/local-user')
  localUser!: LocalUser;

  @service('repos/timestamp-repository')
  timestampRepo!: TimestampRepository;

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
    const allAnnotations = this.args.annotationData.concat(
      this.args.minimizedAnnotations
    );

    const createdAt: number = new Date().getTime();
    const saveRoom = this.roomSerializer.serializeRoom(
      this.args.popUpData,
      allAnnotations,
      true
    );

    const timestamps =
      this.timestampRepo.getTimestampsForCommitId('cross-commit');

    const content: SnapshotToken = {
      owner: useAuthStore.getState().user!.sub.toString(),
      createdAt: createdAt,
      name: this.snapshotName,
      landscapeToken: this.args.landscapeToken,
      structureData: {
        structureLandscapeData: this.args.landscapeData.structureLandscapeData,
        dynamicLandscapeData: this.args.landscapeData.dynamicLandscapeData,
      },
      serializedRoom: saveRoom,
      timestamps: { timestamps: timestamps },
      camera: {
        x: this.localUser.camera.position.x,
        y: this.localUser.camera.position.y,
        z: this.localUser.camera.position.z,
      },
      isShared: false,
      subscribedUsers: { subscriberList: [] },
      deleteAt: 0,
    };

    this.snapshotService.saveSnapshot(content);
    this.reset();
  }

  @action
  exportSnapshot() {
    const allAnnotations = this.args.annotationData.concat(
      this.args.minimizedAnnotations
    );

    const createdAt: number = new Date().getTime();
    const saveRoom = this.roomSerializer.serializeRoom(
      this.args.popUpData,
      allAnnotations,
      true
    );

    const timestamps =
      this.timestampRepo.getTimestampsForCommitId('cross-commit');

    const content: SnapshotToken = {
      owner: useAuthStore.getState().user!.sub.toString(),
      createdAt: createdAt,
      name: this.snapshotName,
      landscapeToken: this.args.landscapeToken,
      structureData: {
        structureLandscapeData: this.args.landscapeData.structureLandscapeData,
        dynamicLandscapeData: this.args.landscapeData.dynamicLandscapeData,
      },
      serializedRoom: saveRoom,
      timestamps: { timestamps: timestamps },
      camera: {
        x: this.localUser.camera.position.x,
        y: this.localUser.camera.position.y,
        z: this.localUser.camera.position.z,
      },
      isShared: false,
      subscribedUsers: { subscriberList: [] },
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
