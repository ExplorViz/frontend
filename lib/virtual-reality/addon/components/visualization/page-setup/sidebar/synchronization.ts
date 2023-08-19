import Component from '@glimmer/component';
import { action, computed } from '@ember/object';
import { inject as service } from '@ember/service';
import VrRoomService from 'virtual-reality/services/vr-room';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { tracked } from '@glimmer/tracking';
import { RoomListRecord } from 'virtual-reality/utils/vr-payload/receivable/room-list';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LocalUser from 'collaborative-mode/services/local-user';
import SynchronizeService from 'virtual-reality/services/synchronizing';
import SynchronizationSession from 'collaborative-mode/services/synchronization-session';

interface SynchronizationArgs {
  removeComponent(componentPath: string): void;
}

export default class Synchronization extends Component<SynchronizationArgs> {
  @service('local-user')
  localUser!: LocalUser;

  @service('vr-room')
  roomService!: VrRoomService;

  @service('timestamp')
  // @ts-ignore since it is used in template
  private timestampService!: TimestampService;

  @service('collaboration-session')
  private collaborationSession!: CollaborationSession;

  @service('synchronize')
  private synchronizeService!: SynchronizeService;

  @tracked
  rooms: RoomListRecord[] = [];

  @computed('collaborationSession.idToRemoteUser')
  get users() {
    const users = [];
    if (this.localUser.color) {
      // Set name of projector, which should be set up by query parameters
      users.push({
        name: `${this.localUser.userName} (you)`,
        style: `color:#${this.localUser.color.getHexString()}`,
      });
    }
    const remoteUsers = Array.from(
      this.collaborationSession.getAllRemoteUsers()
    ).map((user) => {
      return {
        name: user.userName,
        style: `color:#${user.color.getHexString()}`,
        id: user.userId,
      };
    });

    return users.concat(remoteUsers);
  }

  constructor(owner: any, args: SynchronizationArgs) {
    super(owner, args);

    this.loadRooms(false);
  }

  @action
  hostRoom() {
    this.collaborationSession.hostRoom();
    AlertifyHandler.showAlertifySuccess('Starting synchronization room.');
  }

  @action
  leaveSession() {
    AlertifyHandler.showAlertifyWarning(
      'Disconnecting from synchronization room'
    );
    this.collaborationSession.disconnect();
  }

  @action
  async loadRooms(alert = true) {
    if (alert) {
      AlertifyHandler.showAlertifySuccess('Reloading Rooms');
    }
    const rooms = await this.roomService.listRooms();
    this.rooms = rooms;
  }

  @action
  joinRoom(room: RoomListRecord) {
    AlertifyHandler.showAlertifySuccess(`Join Room: ${room.roomName}`);
    this.collaborationSession.joinRoom(room.roomId);
  }

  @action
  synchronize(id: string) {
    const remoteUser = this.collaborationSession.lookupRemoteUserById(id);
    if (remoteUser) {
      this.synchronizeService.activate(remoteUser);
    } else {
      this.synchronizeService.deactivate();
    }
  }

  // Testing file upload
  @action
  handleFileUpload(event?: Event) {
    if (
      !event ||
      !(event.target instanceof HTMLInputElement) ||
      !event.target.files ||
      event.target.files.length === 0
    ) {
      // handle error case
      console.error('No file selected');
      return;
    }
    const file = event.target.files[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = () => {
        const content = reader.result;
        // do something with the content of the file
        console.log(content);

        if (typeof content === 'string') {
          // this.synchronizationSession.setCount(parseInt(content));
        }
      };

      if (file.type === 'application/json') {
        reader.readAsText(file); //.json
      } else {
        reader.readAsText(file); //.txt
      }
    }
  }

  @action
  close() {
    this.args.removeComponent('synchronization');
  }
}
