import * as THREE from 'three';
const times = [0, 2];
const values = [10.5, 50];
const scaleValues = [1.0, 4];

const PING_ANIMATION_CLIP = new THREE.AnimationClip('ping-animation', 1, [
  new THREE.NumberKeyframeTrack('.scale[x]', times, scaleValues),
  new THREE.NumberKeyframeTrack('.scale[y]', times, scaleValues),
  new THREE.NumberKeyframeTrack('.scale[z]', times, scaleValues),
  new THREE.NumberKeyframeTrack('.position[y]', times, values),
]);

const PING_RADIUS = 1.4;

const PING_SEGMENTS = 22;

export default class PingMesh extends THREE.Mesh {
  private action: THREE.AnimationAction;

  private isPinging: boolean;

  constructor({
    animationMixer,
    color,
  }: {
    animationMixer: THREE.AnimationMixer;
    color: THREE.Color;
  }) {
    super();

    this.geometry = new THREE.CylinderGeometry(
      PING_RADIUS,
      PING_RADIUS,
      PING_SEGMENTS,
      PING_SEGMENTS
    );
    this.material = new THREE.MeshBasicMaterial({ color });
    this.visible = false;
    this.isPinging = false;

    this.action = animationMixer.clipAction(PING_ANIMATION_CLIP, this);
  }

  startPinging() {
    this.isPinging = true;
    this.startAnimation();
  }

  stopPinging() {
    this.isPinging = false;
    this.stopAnimation();
  }

  private startAnimation() {
    this.visible = this.isPinging;
    this.action.play();
  }

  private stopAnimation() {
    this.action.stop();
    this.visible = false;
  }

  updateIntersection(intersection: THREE.Vector3 | undefined) {
    if (intersection) {
      this.position.copy(intersection);
      this.startAnimation();
    } else {
      this.stopAnimation();
    }
  }
}
