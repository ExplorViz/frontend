import { setOwner } from '@ember/application';
import { Clock } from 'three';
import THREEPerformance from 'explorviz-frontend/utils/threejs-performance';
import UserSettings from 'explorviz-frontend/services/user-settings';
import { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import ArZoomHandler from 'extended-reality/utils/ar-helpers/ar-zoom-handler';
import * as THREE from 'three';
import LocalUser from 'collaboration/services/local-user';
import ForceGraph from 'explorviz-frontend/rendering/application/force-graph';
import CameraControls from 'explorviz-frontend/utils/application-rendering/camera-controls';
import Raycaster from 'explorviz-frontend/utils/raycaster';

const clock = new Clock();

interface Args {
  camera: THREE.Camera;
  orthographicCamera: THREE.OrthographicCamera | undefined;
  minimapCamera: THREE.OrthographicCamera;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  updatables: any[];
  zoomHandler?: ArZoomHandler;
  graphBounds?: THREE.Box3;
  graph: ForceGraph;
  controls: CameraControls;
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

  camera: THREE.Camera;

  orthographicCamera: THREE.OrthographicCamera | undefined;

  minimapCamera: THREE.OrthographicCamera;

  scene: THREE.Scene;

  renderer: THREE.WebGLRenderer;

  updatables: any[];

  zoomHandler?: ArZoomHandler;

  graph: ForceGraph;

  controls: CameraControls;

  intersection!: THREE.Vector3;

  raycaster: Raycaster = new Raycaster();

  distance!: number;

  currentViewport = new THREE.Vector4(
    0,
    0,
    window.innerWidth,
    window.innerHeight
  );

  constructor(owner: any, args: Args) {
    setOwner(this, owner);
    this.camera = args.camera;
    this.orthographicCamera = args.orthographicCamera;
    this.minimapCamera = args.minimapCamera;
    this.scene = args.scene;
    this.renderer = args.renderer;
    this.updatables = args.updatables;
    this.zoomHandler = args.zoomHandler;
    this.graph = args.graph;
    this.controls = args.controls;
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

      this.intersection = this.getCurrentFocus();
      // this.controls.perspectiveCameraControls.minPan =
      //   this.graph.boundingBox.min;
      // this.controls.perspectiveCameraControls.maxPan =
      //   this.graph.boundingBox.max;

      // render a frame
      if (
        this.orthographicCamera &&
        this.userSettings.applicationSettings.useOrthographicCamera.value
      ) {
        this.renderer.render(this.scene, this.orthographicCamera);
      } else {
        this.renderer.render(this.scene, this.camera);
      }

      if (this.zoomHandler && this.zoomHandler.zoomEnabled) {
        // must be run after normal render
        this.zoomHandler.renderZoomCamera(this.renderer, this.scene);
      }
      if (this.threePerformance) {
        this.threePerformance.stats.end();
      }
      this.renderMinimap();
      this.updateMinimapCamera();
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

  private getCurrentFocus(): THREE.Vector3 {
    let newPos = new THREE.Vector3();

    newPos = this.raycaster.raycastToGround(
      this.camera,
      this.graph.boundingBox
    );

    return newPos;
  }

  updateLocalMinimapMarker() {
    this.localUser.minimapMarker.position.set(
      this.intersection.x,
      this.localUser.minimapMarker.position.y,
      this.intersection.z
    );
    const localForward = new THREE.Vector3(0, 0, -1);

    // Apply the camera's rotation to the local forward vector
    const cameraDirection = localForward.applyQuaternion(
      this.camera.quaternion
    );
    this.localUser.minimapMarker.lookAt(
      cameraDirection.x,
      -(Math.PI / 4),
      cameraDirection.z
    );
  }

  updateMinimapCamera() {
    // Get the bounding box from the graph
    const boundingBox = this.graph.boundingBox;

    // Calculate the size of the bounding box
    const size = boundingBox.getSize(new THREE.Vector3());

    this.distance = this.userSettings.applicationSettings.distance.value;

    // Scale the frustum based on the distance factor
    const halfWidth = (size.x / 110) * this.distance;
    const halfHeight = (size.z / 110) * this.distance;

    // Adjust the orthographic camera's frustum
    this.localUser.minimapCamera.left = -halfWidth;
    this.localUser.minimapCamera.right = halfWidth;
    this.localUser.minimapCamera.top = halfHeight;
    this.localUser.minimapCamera.bottom = -halfHeight;

    this.localUser.minimapCamera.position.set(
      this.intersection.x,
      1,
      this.intersection.z
    );

    this.updateLocalMinimapMarker();

    // Update the projection matrix to apply the changes
    this.localUser.minimapCamera.updateProjectionMatrix();
  }

  renderMinimap() {
    // Set the size and newPos for the minimap
    const minimapNums = this.localUser.minimap();
    const minimapHeight = minimapNums[0];
    const minimapWidth = minimapNums[1];
    const minimapX = minimapNums[2];
    const minimapY = minimapNums[3];
    const borderWidth = 4;

    // Enable scissor test and set the scissor area
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
    this.renderer.setClearColor(0x000000); // Schwarz
    this.renderer.clear();

    // Render the minimap scene
    this.renderer.render(this.scene, this.minimapCamera);
    // Disable scissor test
    this.renderer.setViewport(...this.currentViewport);
    this.renderer.setScissorTest(false);
  }
}
