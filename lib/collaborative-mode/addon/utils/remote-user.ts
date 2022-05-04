import THREE from 'three';
import { Pose } from 'virtual-reality/utils/vr-message/sendable/user_positions';
import MousePing from './mouse-ping-helper';

type Camera = {
  model: THREE.Object3D;
};

export default class RemoteUser extends THREE.Object3D {
  userName: string;

  userId: string;

  color: THREE.Color;

  state: string;

  camera: Camera | null;

  mousePing: MousePing;

  constructor({
    userName,
    userId,
    color,
    state,
  }: {
    userName: string;
    userId: string;
    color: THREE.Color;
    state: string;
  }) {
    super();
    this.userName = userName;
    this.userId = userId;
    this.color = color;
    this.state = state;

    this.camera = null;
    this.mousePing = new MousePing(color);
  }

  initCamera(obj: THREE.Object3D, initialPose: Pose) {
    this.camera = { model: obj };

    this.add(this.camera.model);
    this.updateCamera(initialPose);
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

  removeAllObjects3D() {
    this.removeCamera();
  }
}
