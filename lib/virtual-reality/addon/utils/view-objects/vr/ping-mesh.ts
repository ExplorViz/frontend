import * as THREE from 'three';

export const PING_ANIMATION_CLIP = new THREE.AnimationClip(
  'ping-animation',
  0.5,
  [
    new THREE.NumberKeyframeTrack('.scale[x]', [0.0, 0.5], [1.0, 2.6]),
    new THREE.NumberKeyframeTrack('.scale[y]', [0.0, 0.5], [1.0, 2.6]),
    new THREE.NumberKeyframeTrack('.scale[z]', [0.0, 0.5], [1.0, 2.6]),
  ]
);

const PING_RADIUS = 2.4;

const PING_SEGMENTS = 32;

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

    this.geometry = new THREE.SphereGeometry(
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
