import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import MousePing from 'collaborative-mode/utils/mouse-ping-helper';
import THREE from 'three';

export default class LocalUser extends Service.extend({
  // anything which *must* be merged to prototype here
}) {

  userId!: string;

  @tracked
  userName?: string;

  @tracked
  color: THREE.Color | undefined;

  @tracked
  defaultCamera!: THREE.PerspectiveCamera;

  mousePing!: MousePing;

  init() {
    super.init();

    this.userId = 'unknown';

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
    this.userId = id;
    this.userName = name;

    this.color = color;
    this.mousePing = new MousePing(color)
  }


}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'local-user': LocalUser;
  }
}
