import LocalUser from 'collaboration/services/local-user';
import * as THREE from 'three';
import NameTagSprite from 'extended-reality/utils/view-objects/vr/name-tag-sprite';
import PingMesh from 'extended-reality/utils/view-objects/vr/ping-mesh';
import RayMesh from 'extended-reality/utils/view-objects/vr/ray-mesh';
import { DEFAULT_RAY_LENGTH } from 'extended-reality/utils/vr-controller';
import VrControllerModelFactory from 'extended-reality/utils/vr-controller/vr-controller-model-factory';
import MousePing from './mouse-ping-helper';
import {
  ControllerPose,
  Pose,
} from 'extended-reality/utils/vr-web-wocket-messages/sendable/user-positions';
import {
  CONTROLLER_1_ID,
  CONTROLLER_2_ID,
  ControllerId,
} from './web-socket-messages/types/controller-id';

type Camera = {
  model: THREE.Object3D;
};

type Controller = {
  assetUrl: string;
  intersection: THREE.Vector3 | undefined;
  model: THREE.Object3D;
  ray: RayMesh;
  pingMesh: PingMesh;
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

  localUser: LocalUser;

  minimapMarker!: THREE.Mesh | null;

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
    this.initMinimapMarker();
  }

  /**
   * Initialize the Minimap marker for this user.
   */
  private initMinimapMarker() {
    const userMarkerGeometry = new THREE.SphereGeometry(
      this.calculateDistanceFactor(),
      32
    );
    const userMarkerMaterial = new THREE.MeshBasicMaterial({
      color: this.color,
    });
    const userMarkerMesh = new THREE.Mesh(
      userMarkerGeometry,
      userMarkerMaterial
    );
    // Add marker to the minimap scene
    userMarkerMesh.position.set(2, 0.5, this.localUser.camera.position.z);
    userMarkerMesh.layers.enable(7);
    userMarkerMesh.layers.disable(0);
    userMarkerMesh.name = this.userId;
    this.minimapMarker = userMarkerMesh;
  }

  /**
   * Updates the camera model's position and rotation.
   *
   * @param Object containing the new camera position and quaternion.
   */
  updateCamera(pose: Pose) {
    if (this.camera) {
      this.camera.model.position.fromArray(pose.position);
      this.camera.model.quaternion.fromArray(pose.quaternion);
      this.updateMinimapMarkerPosition();
    }
  }

  /**
   * Update the minimap marker's position based on the camera's position.
   */
  updateMinimapMarkerPosition() {
    const distanceFactor = this.calculateDistanceFactor();
    if (this.minimapMarker && this.camera) {
      if (distanceFactor < 0.2) {
        this.minimapMarker.geometry.dispose();
        this.minimapMarker.geometry = new THREE.SphereGeometry(
          distanceFactor,
          32
        );
        this.minimapMarker.position.set(
          this.camera.model.position.x,
          this.minimapMarker.position.y,
          this.camera.model.position.z
        );
      }
    } else if (!this.minimapMarker) {
      this.initMinimapMarker();
    }
  }

  private calculateDistanceFactor(): number {
    return 0.2 / this.localUser.settings.applicationSettings.zoom.value;
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
    const model =
      await VrControllerModelFactory.INSTANCE.loadAssetScene(assetUrl);
    this.add(model);

    // Initialize ray.
    const ray = new RayMesh(this.color);
    model.add(ray);

    // Initialize pinging.
    const pingMesh = new PingMesh({
      animationMixer: this.animationMixer,
      color: this.color,
    });

    this.add(pingMesh);

    const controller = {
      assetUrl,
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      intersection: undefined,
      model,
      ray,
      pingMesh,
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
    this.removeMinimapMarker(); // Remove minimap marker
  }

  /**
   * Remove the minimap marker from the scene.
   */
  removeMinimapMarker() {
    if (this.minimapMarker) {
      this.minimapMarker.parent?.remove(this.minimapMarker);
      this.minimapMarker = null;
    }
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

  getVisualizationMode(): string {
    return this.localUser.visualizationMode;
  }

  /**
   * Updates the remote user once per frame.
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

  setVisible(visible: boolean) {
    this.controllers.forEach((controller) => {
      if (controller) controller.model.visible = visible;
    });
    this.setHmdVisible(visible);
  }

  setHmdVisible(visible: boolean) {
    if (this.camera) {
      this.camera.model.visible = visible;
    }
    if (this.nameTag) {
      this.nameTag.visible = visible;
    }
  }
}
