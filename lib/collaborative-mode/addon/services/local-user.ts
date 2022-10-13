import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import MousePing from 'collaborative-mode/utils/mouse-ping-helper';
import Configuration from 'explorviz-frontend/services/configuration';
import * as THREE from 'three';
import { WebXRManager } from 'three';
import VRController from 'virtual-reality/utils/vr-controller';

export type VisualizationMode = 'browser' | 'ar' | 'vr';

export default class LocalUser extends Service.extend({
  // anything which *must* be merged to prototype here
}) {
  @service('configuration')
  configuration!: Configuration;

  userId!: string;

  @tracked
  userName?: string;

  @tracked
  color: THREE.Color | undefined;

  @tracked
  defaultCamera!: THREE.PerspectiveCamera;

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
    this.defaultCamera = new THREE.PerspectiveCamera(75, 1.0, 0.1, 1000);
    this.defaultCamera.position.set(0, 1, 2);
    if (this.xr?.isPresenting) {
      console.log("init xr");
      return this.xr.getCamera();
    } else {
      console.log("init default");
      this.userGroup.add(this.defaultCamera);
    }
    this.animationMixer = new THREE.AnimationMixer(this.userGroup);
    this.mousePing = new MousePing(new THREE.Color('red'), this.animationMixer);
  }

  get camera() {
    if (this.xr?.isPresenting) {
      console.log("camera");
      return this.xr.getCamera();
    }
    console.log("persepectivecamera");
    return this.defaultCamera;
  }

  tick(delta: number) {
    this.animationMixer.update(delta);
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

  /*
   *  This method is used to adapt the users view to
   *  the new position
   */
  teleportToPosition(
    position: THREE.Vector3,
    {
      adaptCameraHeight = false,
    }: {
      adaptCameraHeight?: boolean;
    } = {},
  ) {
    const worldPos = this.xr?.getCamera().getWorldPosition(new THREE.Vector3());

    const offsetPosition = { x: position.x - worldPos.x, y: position.y, z: position.z - worldPos.z, w: 1 };
    const offsetRotation = new THREE.Quaternion();
    const transform = new XRRigidTransform(offsetPosition, offsetRotation).inverse;
    const teleportSpaceOffset = this.xr?.getReferenceSpace()?.getOffsetReferenceSpace(transform);

    this.xr?.setReferenceSpace(teleportSpaceOffset);
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
    }: { enableX?: boolean; enableY?: boolean; enableZ?: boolean },
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
      .transformDirection(
        this.userGroup.matrix.clone().invert(),
      );
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
    this.userGroup.position.set(0, 0, 0);
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
