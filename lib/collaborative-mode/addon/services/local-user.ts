import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import MousePing from 'collaborative-mode/utils/mouse-ping-helper';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import THREE from 'three';
import { ConnectionStatus } from 'virtual-reality/services/local-vr-user';
import VrRoomService from 'virtual-reality/services/vr-room';
import WebSocketService from 'virtual-reality/services/web-socket';

export default class LocalUser extends Service.extend({
  // anything which *must* be merged to prototype here
}) {

  userId!: string;

  @tracked
  userName?: string;

  @tracked
  connectionStatus: ConnectionStatus = 'offline';

  @tracked
  currentRoomId: string | null = null;

  @tracked
  defaultCamera!: THREE.PerspectiveCamera;

  // TODO this should be handled elsewhere
  @service('vr-room')
  private roomService!: VrRoomService;

  @service('web-socket')
  private webSocket!: WebSocketService;

  mousePing!: MousePing;

  init() {
    super.init();

    this.userId = 'unknown';
    this.connectionStatus = 'offline';

    this.userGroup = new THREE.Group();
    // this.sceneService.scene.add(this.userGroup);

    // Initialize camera. The default aspect ratio is not known at this point
    // and must be updated when the canvas is inserted.
    this.defaultCamera = new THREE.PerspectiveCamera(75, 1.0, 0.1, 1000);
    this.defaultCamera.position.set(0, 1, 2);
    this.userGroup.add(this.defaultCamera);
    this.mousePing = new MousePing(new THREE.Color('skyblue'));
  }

  get camera() {
    // if (this.renderer.xr.isPresenting) {
    //   return this.renderer.xr.getCamera(this.defaultCamera);
    // }
    return this.defaultCamera;
  }

  connected({
    id,
    name,
    color,
  }: {
    id: string;
    name: string;
    color: THREE.Color;
  }) {
    this.connectionStatus = 'online';
    this.userId = id;
    this.userName = name;

    this.color = color;
    this.mousePing = new MousePing(color)
  }

  get isOnline() {
    return this.connectionStatus === 'online';
  }

  get isConnecting() {
    return this.connectionStatus === 'connecting';
  }

  async hostRoom() {
    if (!this.isConnecting) {
      this.connectionStatus = 'connecting';
      try {
        const response = await this.roomService.createRoom();
        this.joinRoom(response.roomId, { checkConnectionStatus: false });
      } catch (e: any) {
        this.connectionStatus = 'offline';
        AlertifyHandler.showAlertifyError('Cannot reach VR-Service.');
      }
    }
  }

  async joinRoom(roomId: string, {
    checkConnectionStatus = true,
  }: { checkConnectionStatus?: boolean } = {}) {
    if (!checkConnectionStatus || !this.isConnecting) {
      this.connectionStatus = 'connecting';
      this.currentRoomId = roomId;
      try {
        const response = await this.roomService.joinLobby(this.currentRoomId);
        // TODO this is not reachable here and should never be
        this.webSocket.initSocket(response.ticketId);
      } catch (e: any) {
        this.connectionStatus = 'offline';
        this.currentRoomId = null;
        AlertifyHandler.showAlertifyError('Cannot reach Collaboration-Service.');
      }
    }
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'local-user': LocalUser;
  }
}
