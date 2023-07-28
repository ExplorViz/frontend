import LocalUser from 'collaborative-mode/services/local-user';
import * as THREE from 'three';
import NameTagSprite from 'virtual-reality/utils/view-objects/vr/name-tag-sprite';
import PingMesh from 'virtual-reality/utils/view-objects/vr/ping-mesh';
import RayMesh from 'virtual-reality/utils/view-objects/vr/ray-mesh';
import WaypointIndicator from 'virtual-reality/utils/view-objects/vr/waypoint-indicator';
import { DEFAULT_RAY_LENGTH } from 'virtual-reality/utils/vr-controller';
import VrControllerModelFactory from 'virtual-reality/utils/vr-controller/vr-controller-model-factory';
import {
  ControllerPose,
  Pose,
} from 'virtual-reality/utils/vr-message/sendable/user_positions';
import {
  ControllerId,
  CONTROLLER_1_ID,
  CONTROLLER_2_ID,
} from 'virtual-reality/utils/vr-message/util/controller_id';
import MousePing from './mouse-ping-helper';

type Camera = {
  model: THREE.Object3D;
};

type Controller = {
  assetUrl: string;
  intersection: THREE.Vector3 | undefined;
  model: THREE.Object3D;
  ray: RayMesh;
  pingMesh: PingMesh;
  waypointIndicator: WaypointIndicator;
};

export default class RemoteUser extends THREE.Object3D {
  userName: string;

  userId: string;

  color: THREE.Color;

  state: string;

  camera: Camera | null;

  private animationMixer: THREE.AnimationMixer;

  mousePing: MousePing;

  controllers: (Controller | null)[];

  nameTag: NameTagSprite | null;

  private localUser: LocalUser;

  constructor({
    userName,
    userId,
    color,
    state,
    localUser,
  }: {
    userName: string;
    userId: string;
    color: THREE.Color;
    state: string;
    localUser: LocalUser;
  }) {
    super();
    this.userName = userName;
    this.userId = userId;
    this.color = color;
    this.state = state;

    this.animationMixer = new THREE.AnimationMixer(this);

    this.camera = null;
    this.mousePing = new MousePing(color, this.animationMixer);
    this.controllers = [null, null];
    this.nameTag = null;

    this.localUser = localUser;
  }

  /**
   * Updates the camera model's position and rotation.
   *
   * @param Object containing the new camera position and quaterion.
   */
  updateCamera(pose: Pose) {
    if (this.camera) {
      pose.position[1] -= 0.01;

      this.camera.model.position.fromArray(pose.position);
      this.camera.model.quaternion.fromArray(pose.quaternion);
    }
  }

  protected removeCamera() {
    if (this.camera && this.camera.model) {
      this.remove(this.camera.model);
      this.camera = null;
    }
  }

  initCamera(obj: THREE.Object3D, initialPose: Pose) {
    this.camera = { model: obj };

    this.add(this.camera.model);
    this.updateCamera(initialPose);
    this.addNameTag();
  }

  async initController(
    controllerId: ControllerId,
    assetUrl: string,
    initialPose: ControllerPose
  ): Promise<void> {
    this.removeController(controllerId);

    // Load controller model.
    const model = await VrControllerModelFactory.INSTANCE.loadAssetScene(
      assetUrl
    );
    this.add(model);

    // Initialize ray.
    const ray = new RayMesh(this.color);
    model.add(ray);

    // Initialize pinging.
    const pingMesh = new PingMesh({
      animationMixer: this.animationMixer,
      color: this.color,
    });
    const waypointIndicator = new WaypointIndicator({
      target: pingMesh,
      color: this.color,
    });
    this.add(pingMesh);
    this.localUser.defaultCamera.add(waypointIndicator);

    const controller = {
      assetUrl,
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      intersection: undefined,
      model,
      ray,
      pingMesh,
      waypointIndicator,
    };
    this.controllers[controllerId] = controller;
    this.add(controller.model);

    this.updateController(controllerId, initialPose);
  }

  removeController(controllerId: ControllerId) {
    const controller = this.controllers[controllerId];
    if (!controller) return;
    this.remove(controller.model);
    this.remove(controller.pingMesh);
    this.localUser.defaultCamera.remove(controller.waypointIndicator);
    this.controllers[controllerId] = null;
  }

  private addNameTag() {
    this.nameTag = new NameTagSprite(this.userName, this.color);
    this.nameTag.position.y += 0.3;
    this.camera?.model.add(this.nameTag);
  }

  private removeNameTag() {
    this.nameTag?.parent?.remove(this.nameTag);
    this.nameTag = null;
  }

  removeAllObjects3D() {
    this.removeController(CONTROLLER_1_ID);
    this.removeController(CONTROLLER_2_ID);
    this.removeCamera();
    this.removeNameTag();
  }

  togglePing(controllerId: ControllerId, isPinging: boolean) {
    const controller = this.controllers[controllerId];
    if (!controller) return;

    if (isPinging) {
      controller.pingMesh.startPinging();
    } else {
      controller.pingMesh.stopPinging();
    }
  }

  getVisualizationMode() : string {
    return this.localUser.visualizationMode;
  }

  /**
   * Updates the the remote user once per frame.
   *
   * @param delta The time since the last update.
   */
  update(delta: number) {
    this.animationMixer.update(delta);

    // Update length of rays such that they extend to the intersection point.
    this.controllers.forEach((controller) => {
      if (controller) {
        const distance = controller.intersection
          ? controller.ray
              .getWorldPosition(new THREE.Vector3())
              .sub(controller.intersection)
              .length()
          : DEFAULT_RAY_LENGTH;
        controller.ray.scale.z = distance;
      }
    });
  }

  /**
   * Updates the controller1 model's position and rotation.
   *
   * @param Object containing the new controller1 position and quaterion.
   */
  updateController(
    controllerId: ControllerId,
    { position, quaternion, intersection }: ControllerPose
  ) {
    const controller = this.controllers[controllerId];
    if (!controller) return;

    if (controller) {
      controller.model.position.fromArray(position);
      controller.model.quaternion.fromArray(quaternion);
      controller.intersection =
        intersection && new THREE.Vector3().fromArray(intersection);

      controller.pingMesh.updateIntersection(controller.intersection);
    }
  }

  /**
   * Hides user or unhides them.
   *
   * @param {boolean} visible - If false, hides user's controllers, camera and name tag.
   *                         Shows them if true.
   */
  setVisible(visible: boolean) {
    this.controllers.forEach((controller) => {
      if (controller) controller.model.visible = visible;
    });
    this.setHmdVisible(visible);
  }

  /**
   * Hide or display user's HMD and name tag
   *
   * @param visible Determines visibility of HMD and name tag
   */
  setHmdVisible(visible: boolean) {
    if (this.camera) {
      this.camera.model.visible = visible;
    }
    if (this.nameTag) {
      this.nameTag.visible = visible;
    }
  }
}
