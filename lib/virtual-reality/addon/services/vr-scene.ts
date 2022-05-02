import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import debugLogger from 'ember-debug-logger';
import Configuration from 'explorviz-frontend/services/configuration';
import THREE from 'three';
import FloorMesh from '../utils/view-objects/vr/floor-mesh';

const FLOOR_SIZE = 1000;

export default class VrSceneService extends Service {
  @service('configuration')
  private configuration!: Configuration;

  @tracked
  scene: THREE.Scene;

  private debug = debugLogger('LandscapeRenderer');

  constructor(properties?: object) {
    super(properties);

    // Initialize sceene.
    this.debug('Scene initializing')
    this.scene = new THREE.Scene();
    this.scene.background = this.configuration.landscapeColors.backgroundColor;
    this.debug('Scene initialized')

    // Initilize floor.
    const floor = new FloorMesh(FLOOR_SIZE, FLOOR_SIZE);
    this.scene.add(floor);

    // Initialize lights.
    const light = new THREE.AmbientLight(new THREE.Color(0.65, 0.65, 0.65));
    this.scene.add(light);

    const spotLight = new THREE.SpotLight(0xffffff, 0.5, 2000);
    spotLight.position.set(-200, 100, 100);
    spotLight.castShadow = true;
    spotLight.angle = 0.3;
    spotLight.penumbra = 0.2;
    spotLight.decay = 2;
    this.scene.add(spotLight);

    // Add a light that illuminates the sky box if the user dragged in a backgound image.
    const skyLight = new THREE.SpotLight(0xffffff, 0.5, 1000, Math.PI, 0, 0);
    skyLight.castShadow = false;
    this.scene.add(skyLight);
  }
}

declare module '@ember/service' {
  interface Registry {
    'vr-scene': VrSceneService;
  }
}
