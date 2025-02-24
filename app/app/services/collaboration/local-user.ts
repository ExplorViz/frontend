import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import MousePing from 'explorviz-frontend/utils/collaboration/mouse-ping-helper';
import Configuration from 'explorviz-frontend/services/configuration';
import * as THREE from 'three';
import { WebXRManager } from 'three';
import VRController from 'explorviz-frontend/utils/extended-reality/vr-controller';
import { getPoses } from 'explorviz-frontend/utils/extended-reality/vr-helpers/vr-poses';
import MessageSender from './message-sender';
import UserSettings from 'explorviz-frontend/services/user-settings';
import ApplicationObject3D from 'react-lib/src/view-objects/3d/application/application-object-3d';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import ChatService from 'explorviz-frontend/services/chat';
import collaborationSession from 'explorviz-frontend/services/collaboration/collaboration-session';
import {
  EntityMesh,
  isEntityMesh,
} from 'react-lib/src/utils/extended-reality/vr-helpers/detail-info-composer';
import {
  useLocalUserStore,
  VisualizationMode,
} from 'react-lib/src/stores/collaboration/local-user';

// export type VisualizationMode = 'browser' | 'ar' | 'vr';

export default class LocalUser extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  @service('configuration')
  configuration!: Configuration;

  @service('collaboration/message-sender')
  sender!: MessageSender;

  @service('user-settings')
  settings!: UserSettings;

  @service
  applicationRenderer!: ApplicationRenderer;

  @service('chat')
  chatService!: ChatService;

  @service('collaboration/collaboration-session')
  collaborationSession!: collaborationSession;

  get userId(): string {
    return useLocalUserStore.getState().userId;
  }

  set userId(value) {
    useLocalUserStore.setState({ userId: value });
  }

  // @tracked
  get userName(): string {
    return useLocalUserStore.getState().userName;
  }

  set userName(value) {
    useLocalUserStore.setState({ userName: value });
  }

  // @tracked
  get color(): THREE.Color {
    return useLocalUserStore.getState().color;
  }

  set color(value) {
    useLocalUserStore.setState({ color: value });
  }

  // @tracked
  get defaultCamera(): THREE.PerspectiveCamera {
    return useLocalUserStore.getState().defaultCamera;
  }

  set defaultCamera(value) {
    useLocalUserStore.setState({ defaultCamera: value });
  }

  // @tracked
  get minimapCamera(): THREE.OrthographicCamera {
    return useLocalUserStore.getState().minimapCamera;
  }

  set minimapCamera(value) {
    useLocalUserStore.setState({ minimapCamera: value });
  }

  // @tracked
  get visualizationMode(): VisualizationMode {
    return useLocalUserStore.getState().visualizationMode;
  }

  set visualizationMode(value: VisualizationMode) {
    useLocalUserStore.setState({ visualizationMode: value });
  }

  mousePing!: MousePing;

  get userGroup(): THREE.Group {
    return useLocalUserStore.getState().userGroup;
  }

  set userGroup(value) {
    useLocalUserStore.setState({ userGroup: value });
  }

  // TODO check if this is used anywhere???
  get task(): any {
    return useLocalUserStore.getState().task;
  }

  set task(value) {
    useLocalUserStore.setState({ task: value });
  }

  controller1: VRController | undefined;

  controller2: VRController | undefined;

  get panoramaSphere(): THREE.Object3D | undefined {
    return useLocalUserStore.getState().panoramaSphere;
  }

  set panoramaSphere(value) {
    useLocalUserStore.setState({ panoramaSphere: value });
  }

  get animationMixer(): THREE.AnimationMixer {
    return useLocalUserStore.getState().animationMixer;
  }

  set animationMixer(value) {
    useLocalUserStore.setState({ animationMixer: value });
  }

  get xr(): WebXRManager | undefined {
    return useLocalUserStore.getState().xr;
  }

  set xr(value) {
    useLocalUserStore.setState({ xr: value });
  }

  // @tracked
  get isHost(): boolean {
    return useLocalUserStore.getState().isHost;
  }

  set isHost(value) {
    useLocalUserStore.setState({ isHost: value });
  }

  init() {
    super.init();

    // What to do with this? Can xr even be initialized at this point?
    // Always adding defaultCamera to userGroup currently in store.
    if (this.xr?.isPresenting) {
      return this.xr.getCamera();
    } else {
      this.userGroup.add(this.defaultCamera);
    }

    this.mousePing = new MousePing(new THREE.Color('red'), this.animationMixer);

    return undefined;
  }

  get camera() {
    return useLocalUserStore.getState().getCamera();
  }

  tick(delta: number) {
    this.animationMixer.update(delta);
    this.sendPositions();
  }

  sendPositions() {
    const { camera, controller1, controller2 } = getPoses(
      this.camera,
      this.controller1,
      this.controller2
    );
    this.sender.sendPoseUpdate(camera, controller1, controller2);
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
    this.userId = id;
    this.userName = name;

    this.color = color;
    this.mousePing = new MousePing(new THREE.Color(color), this.animationMixer);
  }

  // VR Capabilities
  setController1(controller1: VRController) {
    this.controller1 = controller1;
    this.userGroup.add(controller1);
  }

  setController2(controller2: VRController) {
    this.controller2 = controller2;
    this.userGroup.add(controller2);
  }

  setPanoramaSphere(panoramaSphere: THREE.Object3D) {
    useLocalUserStore.getState().setPanoramaSphere(panoramaSphere);
  }

  updateControllers(delta: number) {
    if (this.controller1) this.controller1.update(delta);
    if (this.controller2) this.controller2.update(delta);
  }

  updateCameraAspectRatio(width: number, height: number) {
    this.renderer.setSize(width, height); // Should this be this.applicationRenderer?
    this.defaultCamera.aspect = width / height;
    this.defaultCamera.updateProjectionMatrix();
  }

  pingByModelId(
    modelId: string,
    appId: string,
    options?: { durationInMs?: number; nonrestartable?: boolean }
  ) {
    if (!this.mousePing || !modelId) {
      return;
    }

    const duration = options?.durationInMs ?? 5000;

    const applicationObject3D =
      this.applicationRenderer.getApplicationById(appId);

    if (applicationObject3D) {
      const mesh = applicationObject3D.getBoxMeshByModelId(modelId);
      if (!mesh) return;

      if (options?.nonrestartable) {
        this.pingNonRestartable(
          mesh,
          mesh.getWorldPosition(mesh!.position),
          duration
        );
      } else {
        this.ping(mesh, mesh.getWorldPosition(mesh.position), duration);
      }
    }
  }

  pingNonRestartable(
    obj: EntityMesh | null,
    pingPosition: THREE.Vector3,
    durationInMs: number = 5000
  ) {
    // or touch, primary input ...
    if (!this.mousePing || !obj) {
      return;
    }

    const app3D = obj.parent;
    if (!(app3D instanceof ApplicationObject3D)) {
      return;
    }

    app3D.worldToLocal(pingPosition);

    this.applicationRenderer.openParents(obj, app3D.getModelId());

    this.mousePing.pingNonRestartable.perform({
      parentObj: app3D,
      position: pingPosition,
      durationInMs,
    });

    this.sender.sendMousePingUpdate(app3D.getModelId(), true, pingPosition);
  }

  ping(
    obj: THREE.Object3D,
    pingPosition: THREE.Vector3,
    durationInMs: number = 5000
  ) {
    const app3D = obj.parent;
    if (!app3D || !(app3D instanceof ApplicationObject3D)) {
      return;
    }

    app3D.worldToLocal(pingPosition);

    if (isEntityMesh(obj)) {
      this.applicationRenderer.openParents(obj, app3D.getModelId());
    }

    const replay = false;

    this.mousePing.ping.perform({
      parentObj: app3D,
      position: pingPosition,
      durationInMs,
      replay,
    });

    this.sender.sendMousePingUpdate(app3D.getModelId(), true, pingPosition);
    this.chatService.sendChatMessage(
      this.userId,
      `${this.userName}(${this.userId}) pinged ${obj.dataModel.name}`,
      true,
      'ping',
      [app3D.getModelId(), pingPosition.toArray(), durationInMs]
    );
  }

  pingReplay(
    userId: string,
    modelId: string,
    position: number[],
    durationInMs: number,
    replay: boolean = true
  ) {
    const remoteUser = this.collaborationSession.lookupRemoteUserById(userId);

    const applicationObj = this.applicationRenderer.getApplicationById(modelId);

    const point = new THREE.Vector3().fromArray(position);
    if (applicationObj) {
      if (remoteUser) {
        remoteUser.mousePing.ping.perform({
          parentObj: applicationObj,
          position: point,
          durationInMs,
          replay,
        });
      } else {
        this.mousePing.ping.perform({
          parentObj: applicationObj,
          position: point,
          durationInMs,
          replay,
        });
      }
    }
  }

  /*
   *  This method is used to adapt the users view to
   *  the new position
   */
  teleportToPosition(position: THREE.Vector3) {
    useLocalUserStore.getState().teleportToPosition(position);
  }

  getCameraWorldPosition() {
    return useLocalUserStore.getState().getCameraWorldPosition();
  }

  get cameraHeight(): number {
    return useLocalUserStore.getState().getCameraHeight();
  }

  set cameraHeight(cameraHeight: number) {
    useLocalUserStore.getState().setCameraHeight(cameraHeight);
  }

  /**
   * Moves the user group in the given direction relative to the default camera.
   */
  moveInCameraDirection(
    direction: THREE.Vector3,
    {
      enableX = true,
      enableY = true,
      enableZ = true,
    }: { enableX?: boolean; enableY?: boolean; enableZ?: boolean }
  ) {
    useLocalUserStore.getState().moveInCameraDirection(direction, {
      enableX,
      enableY,
      enableZ,
    });
  }

  /**
   * Rotates the camera around the local x and world y axis.
   */
  rotateCamera(x: number, y: number) {
    useLocalUserStore.getState().rotateCamera(x, y);
  }

  /*
   * This method is used to adapt the users view to the initial position
   */
  resetPositionAndRotation() {
    useLocalUserStore.getState().resetPositionAndRotation();
  }

  reset() {
    this.resetPositionAndRotation();

    this.resetController(this.controller1);
    this.controller1 = undefined;

    this.resetController(this.controller2);
    this.controller2 = undefined;
  }

  private resetController(controller: VRController | undefined) {
    if (!controller) return;

    this.userGroup.remove(controller);
    controller.children.forEach((child) => controller.remove(child));
    controller.gripSpace?.children.forEach((child) => {
      controller.gripSpace?.remove(child);
    });
    controller.removeTeleportArea();
  }
}
// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'collaboration/local-user': LocalUser;
  }
}
