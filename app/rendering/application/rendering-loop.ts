import { setOwner } from '@ember/application';
import { Clock } from 'three';
import THREEPerformance from 'explorviz-frontend/utils/threejs-performance';
import UserSettings from 'explorviz-frontend/services/user-settings';
import { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import ArZoomHandler from 'extended-reality/utils/ar-helpers/ar-zoom-handler';
import * as THREE from 'three';
import LocalUser from 'collaboration/services/local-user';
import MinimapService from 'explorviz-frontend/services/minimap-service';

const clock = new Clock();

interface Args {
  camera: THREE.Camera;
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

  @service('local-user')
  private localUser!: LocalUser;

  @service('minimap-service')
  minimapService!: MinimapService;

  camera: THREE.Camera;

  minimapCamera: THREE.OrthographicCamera;

  scene: THREE.Scene;

  renderer: THREE.WebGLRenderer;

  updatables: any[];

  zoomHandler?: ArZoomHandler;

  currentViewport = new THREE.Vector4(
    0,
    0,
    window.innerWidth,
    window.innerHeight
  );

  constructor(owner: any, args: Args) {
    setOwner(this, owner);
    this.camera = args.camera;
    this.scene = args.scene;
    this.renderer = args.renderer;
    this.updatables = args.updatables;
    this.zoomHandler = args.zoomHandler;
    this.minimapCamera = this.localUser.minimapCamera;
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

      // Render a frame
      this.renderer.render(this.scene, this.camera);

      if (this.zoomHandler && this.zoomHandler.zoomEnabled) {
        // must be run after normal render
        this.zoomHandler.renderZoomCamera(this.renderer, this.scene);
      }
      if (this.threePerformance) {
        this.threePerformance.stats.end();
      }

      if (this.minimapService.minimapEnabled) {
        this.renderMinimap();
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
  /**
   * Renders the minimap every tick, either on top right corner or as the minimap overlay.
   */
  renderMinimap() {
    const minimapNums = this.minimapService.minimap();
    const minimapHeight = minimapNums[0];
    const minimapWidth = minimapNums[1];
    const minimapX = minimapNums[2];
    const minimapY = minimapNums[3];
    const borderWidth = 1;

    this.currentViewport = this.renderer.getViewport(new THREE.Vector4());

    // Enable scissor test and set the scissor area for the border
    this.renderer.setScissorTest(true);
    this.renderer.setScissor(
      minimapX - borderWidth,
      minimapY - borderWidth,
      minimapWidth + 2 * borderWidth,
      minimapHeight + 2 * borderWidth
    );
    this.renderer.setViewport(
      minimapX - borderWidth,
      minimapY - borderWidth,
      minimapWidth + 2 * borderWidth,
      minimapHeight + 2 * borderWidth
    );

    // Background color for the border
    this.renderer.setClearColor('#989898');
    this.renderer.clear();

    // Set scissor and viewport for the minimap itself
    this.renderer.setScissor(minimapX, minimapY, minimapWidth, minimapHeight);
    this.renderer.setViewport(minimapX, minimapY, minimapWidth, minimapHeight);

    // Render the minimap scene
    this.renderer.render(this.scene, this.minimapCamera);

    // Restore original viewport and disable scissor test
    this.renderer.setViewport(...this.currentViewport);
    this.renderer.setScissorTest(false);
  }
}
