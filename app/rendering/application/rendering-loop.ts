import { setOwner } from '@ember/application';
import { Clock } from 'three';
import THREEPerformance from 'explorviz-frontend/utils/threejs-performance';
import UserSettings from 'explorviz-frontend/services/user-settings';
import { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import ArZoomHandler from 'virtual-reality/utils/ar-helpers/ar-zoom-handler';
import * as THREE from 'three';

const clock = new Clock();

interface Args {
  camera: THREE.Camera;
  orthographicCamera: THREE.OrthographicCamera;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  updatables: any[];
  zoomHandler?: ArZoomHandler;
}

export default class RenderingLoop {
  threePerformance: THREEPerformance | undefined;

  axesHelper: THREE.AxesHelper | undefined;

  lightHelper: THREE.DirectionalLightHelper | undefined;

  debug = debugLogger('RenderingLoop');

  @service('user-settings')
  userSettings!: UserSettings;

  camera: THREE.Camera;

  orthographicCamera: THREE.OrthographicCamera;

  scene: THREE.Scene;

  renderer: THREE.WebGLRenderer;

  updatables: any[];

  zoomHandler?: ArZoomHandler;

  constructor(owner: any, args: Args) {
    setOwner(this, owner);
    this.camera = args.camera;
    this.orthographicCamera = args.orthographicCamera;
    this.scene = args.scene;
    this.renderer = args.renderer;
    this.updatables = args.updatables;
    this.zoomHandler = args.zoomHandler;
  }

  start() {
    this.renderer.setAnimationLoop((_timestamp, frame) => {
      const { value: showFpsCounter } =
        this.userSettings.applicationSettings.showFpsCounter;

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

      this.handleAxesHelper();
      this.handleLightHelper();

      // tell every animated object to tick forward one frame
      this.tick(frame);

      // render a frame
      this.renderer.render(this.scene, this.camera);
      if (this.zoomHandler && this.zoomHandler.zoomEnabled) {
        // must be run after normal render
        this.zoomHandler.renderZoomCamera(this.renderer, this.scene);
      }
      if (this.threePerformance) {
        this.threePerformance.stats.end();
      }
    });
  }

  stop() {
    this.renderer.setAnimationLoop(null);
    if (this.threePerformance) {
      this.threePerformance.removePerformanceMeasurement();
      this.axesHelper = undefined;
      this.lightHelper = undefined;
    }
  }

  tick(frame?: XRFrame) {
    const delta = clock.getDelta();
    for (let i = 0; i < this.updatables.length; i++) {
      this.updatables[i].tick(delta, frame);
    }
  }

  private handleLightHelper() {
    // Add Light Helper based on setting
    const { value: showLightHelper } =
      this.userSettings.applicationSettings.showLightHelper;
    if (showLightHelper && !this.lightHelper) {
      const light = this.scene.getObjectByName(
        'DirectionalLight'
      ) as THREE.DirectionalLight;

      this.lightHelper = new THREE.DirectionalLightHelper(
        light,
        1,
        new THREE.Color(0x000000)
      );
      this.scene.add(this.lightHelper);
    } else if (!showLightHelper && this.lightHelper) {
      this.scene.remove(this.lightHelper);
      this.lightHelper = undefined;
    }
  }

  private handleAxesHelper() {
    // Add Axes Helper based on setting
    const { value: showAxesHelper } =
      this.userSettings.applicationSettings.showAxesHelper;
    if (showAxesHelper && !this.axesHelper) {
      this.axesHelper = new THREE.AxesHelper(5);
      this.scene.add(this.axesHelper);
    } else if (!showAxesHelper && this.axesHelper) {
      this.scene.remove(this.axesHelper);
      this.axesHelper = undefined;
    }
  }
}
