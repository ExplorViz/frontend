import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import MousePing from 'collaboration/utils/mouse-ping-helper';
import Configuration from 'explorviz-frontend/services/configuration';
import * as THREE from 'three';
import { WebXRManager } from 'three';
import VRController from 'extended-reality/utils/vr-controller';
import { getPoses } from 'extended-reality/utils/vr-helpers/vr-poses';
import MessageSender from './message-sender';
import UserSettings from 'explorviz-frontend/services/user-settings';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import {
  EntityMesh,
  isEntityMesh,
} from 'extended-reality/utils/vr-helpers/detail-info-composer';

export type VisualizationMode = 'browser' | 'ar' | 'vr';

export default class LocalUser extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  @service('configuration')
  configuration!: Configuration;

  @service('message-sender')
  sender!: MessageSender;

  @service('user-settings')
  settings!: UserSettings;

  @service
  applicationRenderer!: ApplicationRenderer;

  userId!: string;

  @tracked
  userName = 'You';

  @tracked
  color: THREE.Color = new THREE.Color('red');

  @tracked
  defaultCamera!: THREE.PerspectiveCamera;

  @tracked
  orthographicCamera!: THREE.OrthographicCamera;

  @tracked
  visualizationMode: VisualizationMode = 'browser';

  mousePing!: MousePing;

  userGroup!: THREE.Group;

  task: any;

  controller1: VRController | undefined;

  controller2: VRController | undefined;

  panoramaSphere: THREE.Object3D | undefined;

  animationMixer!: THREE.AnimationMixer;

  xr?: WebXRManager;

  init() {
    super.init();

    this.userId = 'unknown';

    this.userGroup = new THREE.Group();

    // Initialize camera. The default aspect ratio is not known at this point
    // and must be updated when the canvas is inserted.
    this.defaultCamera = new THREE.PerspectiveCamera();
    this.orthographicCamera = new THREE.OrthographicCamera();
    // this.defaultCamera.position.set(0, 1, 2);
    if (this.xr?.isPresenting) {
      return this.xr.getCamera();
    } else {
      this.userGroup.add(this.defaultCamera);
    }
    this.animationMixer = new THREE.AnimationMixer(this.userGroup);
    this.mousePing = new MousePing(new THREE.Color('red'), this.animationMixer);

    return undefined;
  }

  get camera() {
    if (this.xr?.isPresenting) {
      return this.xr.getCamera();
    }
    if (this.settings.applicationSettings.useOrthographicCamera.value) {
      return this.orthographicCamera;
    }
    return this.defaultCamera;
  }

  tick(delta: number) {
    this.animationMixer.update(delta);

    if (this.visualizationMode === 'vr') {
      this.sendPositions();
    }
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

  setPanoramaShere(panoramaSphere: THREE.Object3D) {
    this.removePanoramaShere();
    this.panoramaSphere = panoramaSphere;
    this.userGroup.add(panoramaSphere);
  }

  private removePanoramaShere() {
    if (this.panoramaSphere) this.userGroup.remove(this.panoramaSphere);
  }

  updateControllers(delta: number) {
    if (this.controller1) this.controller1.update(delta);
    if (this.controller2) this.controller2.update(delta);
  }

  updateCameraAspectRatio(width: number, height: number) {
    this.renderer.setSize(width, height);
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
      const mesh = applicationObject3D.getBoxMeshbyModelId(modelId);

      if (options?.nonrestartable) {
        this.pingNonRestartable(
          mesh!,
          mesh!.getWorldPosition(mesh!.position),
          duration
        );
      } else {
        this.ping(mesh!, mesh!.getWorldPosition(mesh!.position), duration);
      }
    }
  }

  pingNonRestartable(
    obj: THREE.Object3D | null,
    pingPosition: THREE.Vector3,
    durationInMs: number = 5000
  ) {
    // or touch, primary input ...
    if (!this.mousePing || !obj) {
      return;
    }
    const parentObj = obj.parent;
    if (parentObj) {
      parentObj.worldToLocal(pingPosition);

      this.applicationRenderer.openParents(
        obj as EntityMesh,
        (parentObj as ApplicationObject3D).data.application.id
      );

      this.mousePing.pingNonRestartable.perform({
        parentObj,
        position: pingPosition,
        durationInMs,
      });

      if (parentObj instanceof ApplicationObject3D) {
        this.sender.sendMousePingUpdate(
          parentObj.getModelId(),
          true,
          pingPosition
        );
      }
    }
  }

  ping(
    obj: THREE.Object3D | null,
    pingPosition: THREE.Vector3,
    durationInMs: number = 5000
  ) {
    // or touch, primary input ...
    if (!this.mousePing || !obj) {
      return;
    }
    const parentObj = obj.parent;
    if (parentObj) {
      parentObj.worldToLocal(pingPosition);

      if (isEntityMesh(obj) && parentObj instanceof ApplicationObject3D) {
        this.applicationRenderer.openParents(
          obj as EntityMesh,
          (parentObj as ApplicationObject3D).data.application.id
        );
      }

      this.mousePing.ping.perform({
        parentObj,
        position: pingPosition,
        durationInMs,
      });

      if (parentObj instanceof ApplicationObject3D) {
        this.sender.sendMousePingUpdate(
          parentObj.getModelId(),
          true,
          pingPosition
        );
      }
    }
  }

  /*
   *  This method is used to adapt the users view to
   *  the new position
   */
  teleportToPosition(position: THREE.Vector3) {
    const worldPos = this.xr?.getCamera().getWorldPosition(new THREE.Vector3());

    if (!(worldPos?.x || worldPos?.z)) {
      return;
    }

    const offsetPosition = {
      x: position.x - worldPos.x,
      y: position.y,
      z: position.z - worldPos.z,
      w: 1,
    };
    const offsetRotation = new THREE.Quaternion();
    const transform = new XRRigidTransform(offsetPosition, offsetRotation)
      .inverse;
    const teleportSpaceOffset = this.xr
      ?.getReferenceSpace()
      ?.getOffsetReferenceSpace(transform);

    if (teleportSpaceOffset) this.xr?.setReferenceSpace(teleportSpaceOffset);
  }

  getCameraWorldPosition() {
    return this.camera.getWorldPosition(new THREE.Vector3());
  }

  get cameraHeight(): number {
    return this.userGroup.position.y;
  }

  set cameraHeight(cameraHeight: number) {
    this.userGroup.position.y = cameraHeight;
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
    // Convert direction from the camera's object space to world coordinates.
    const distance = direction.length();
    const worldDirection = direction
      .clone()
      .normalize()
      .transformDirection(this.defaultCamera.matrix);

    // Remove disabled components.
    if (!enableX) worldDirection.x = 0;
    if (!enableY) worldDirection.y = 0;
    if (!enableZ) worldDirection.z = 0;

    // Convert the direction back to object space before applying the translation.
    const localDirection = worldDirection
      .normalize()
      .transformDirection(this.userGroup.matrix.clone().invert());
    this.userGroup.translateOnAxis(localDirection, distance);
  }

  /**
   * Rotates the camera around the local x and world y axis.
   */
  rotateCamera(x: number, y: number) {
    const xAxis = new THREE.Vector3(1, 0, 0);
    const yAxis = new THREE.Vector3(0, 1, 0);
    this.camera.rotateOnAxis(xAxis, x);
    this.camera.rotateOnWorldAxis(yAxis, y);
  }

  /*
   * This method is used to adapt the users view to the initial position
   */
  resetPositionAndRotation() {
    this.teleportToPosition(new THREE.Vector3(0, 0, 0));
    this.defaultCamera.rotation.set(0, 0, 0);
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
    'local-user': LocalUser;
  }
}
