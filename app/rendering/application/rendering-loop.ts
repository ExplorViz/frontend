import { Clock } from 'three';
import THREEPerformance from 'explorviz-frontend/utils/threejs-performance';
import UserSettings from 'explorviz-frontend/services/user-settings';
import { inject as service } from '@ember/service';
import EmberObject from '@ember/object';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { MapControls } from 'three/examples/jsm/controls/OrbitControls';
// import { MapControls } from './jsm/controls/OrbitControls.js';
import debugLogger from 'ember-debug-logger';

const clock = new Clock();

export default class RenderingLoop extends EmberObject {
  threePerformance: THREEPerformance | undefined;

  debug = debugLogger('RenderingLoop');

  @service('user-settings')
  userSettings!: UserSettings;

  camera!: THREE.Camera;

  scene!: THREE.Scene;

  renderer!: THREE.WebGLRenderer;

  controls!: MapControls;

  mapControls: boolean = true;

  updatables!: any[];

  init() {
    super.init();
    if (this.mapControls) {
      this.controls = new MapControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
      this.controls.dampingFactor = 0.05;
      this.controls.minDistance = 0.5;
      this.controls.maxDistance = 30;
      this.controls.maxPolarAngle = Math.PI / 2;
      // this.controls.enablePan = false;
    }
  }

  start() {
    this.renderer.setAnimationLoop(() => {
      const { value: showFpsCounter } = this.userSettings.applicationSettings.showFpsCounter;

      if (showFpsCounter && !this.threePerformance) {
        this.threePerformance = new THREEPerformance();
      } else if (!showFpsCounter && this.threePerformance) {
        this.threePerformance.removePerformanceMeasurement();
        this.threePerformance = undefined;
      }

      if (this.threePerformance) {
        this.threePerformance.threexStats.update(this.renderer);
        this.threePerformance.stats.begin();
      }
      // tell every animated object to tick forward one frame
      this.tick();

      // orbital controls

      this.controls?.update();

      // render a frame
      this.renderer.render(this.scene, this.camera);
      if (this.threePerformance) {
        this.threePerformance.stats.end();
      }
    });
  }

  stop() {
    this.renderer.setAnimationLoop(null);
    if (this.threePerformance) {
      this.threePerformance.removePerformanceMeasurement();
    }
  }

  tick() {
    const delta = clock.getDelta();
    for (let i = 0; i < this.updatables.length; i++) {
      this.updatables[i].tick(delta);
    }
  }
}
