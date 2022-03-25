import { Clock } from 'three';
import THREEPerformance from 'explorviz-frontend/utils/threejs-performance';
import UserSettings from 'explorviz-frontend/services/user-settings';
import { inject as service } from '@ember/service';
import EmberObject from '@ember/object';

const clock = new Clock();

export default class RenderingLoop extends EmberObject {
  threePerformance: THREEPerformance | undefined;

  @service('user-settings')
  userSettings!: UserSettings;

  camera!: THREE.Camera;

  scene!: THREE.Scene ;

  renderer!: THREE.WebGLRenderer;

  updatables: any[] = [];

  init() {
    super.init();
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
