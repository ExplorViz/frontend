import { setOwner } from '@ember/application';
import { Clock } from 'three';
import THREEPerformance from 'explorviz-frontend/utils/threejs-performance';
import UserSettings from 'explorviz-frontend/services/user-settings';
import { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import ArZoomHandler from 'virtual-reality/utils/ar-helpers/ar-zoom-handler';
import * as THREE from 'three';
import {
  CSS3DRenderer,
  CSS3DObject,
} from 'three/examples/jsm/renderers/CSS3DRenderer';

const clock = new Clock();

interface Args {
  camera: THREE.Camera;
  orthographicCamera: THREE.OrthographicCamera | undefined;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  cssRenderer: CSS3DRenderer;
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

  orthographicCamera: THREE.OrthographicCamera | undefined;

  scene: THREE.Scene;

  renderer: THREE.WebGLRenderer;

  cssRenderer: CSS3DRenderer;

  updatables: any[];

  zoomHandler?: ArZoomHandler;

  constructor(owner: any, args: Args) {
    setOwner(this, owner);
    this.camera = args.camera;
    this.orthographicCamera = args.orthographicCamera;
    this.scene = args.scene;
    this.renderer = args.renderer;
    this.cssRenderer = args.cssRenderer;
    this.updatables = args.updatables;
    this.zoomHandler = args.zoomHandler;
  }

  start() {
    this.init();
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
      if (
        this.orthographicCamera &&
        this.userSettings.applicationSettings.useOrthographicCamera.value
      ) {
        this.renderer.render(this.scene, this.orthographicCamera);
      } else {
        this.renderer.render(this.scene, this.camera);
      }

      this.cssRenderer.render(this.scene, this.camera);

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

  init() {
    const iFrame = this.createIFrame(
      'https://www.youtube.com/embed/SJOz3qjfQXU?rel=0',
      480,
      360,
      0.1
    );
    this.scene.add(iFrame);
  }

  makeElementObject(type: any, width: number, height: number) {
    const obj = new THREE.Object3D();

    const element = document.createElement(type);
    element.style.width = width + 'px';
    element.style.height = height + 'px';
    element.style.boxSizing = 'border-box';

    const css3dObject = new CSS3DObject(element);
    // obj.userData.css3dObject = css3dObject;
    obj.add(css3dObject);

    // make an invisible plane for the DOM element to chop
    // clip a WebGL geometry with it.
    const material = new THREE.MeshPhongMaterial({
      opacity: 0.15,
      color: new THREE.Color(0x111111),
      blending: THREE.NoBlending,
      // side	: THREE.DoubleSide,
    });
    const geometry = new THREE.BoxGeometry(width, height, 1);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    obj.add(mesh);

    return obj;
  }

  createIFrame(url: string, width: number, height: number, scale = 0.1) {
    const obj = new THREE.Object3D();

    const iframe = document.createElement('iframe');
    iframe.style.width = width + 'px';
    iframe.style.height = height + 'px';
    iframe.style.border = '0px';
    iframe.src = url;

    const cssObj = new CSS3DObject(iframe);
    cssObj.position.set(0, 0, 0);
    cssObj.rotation.y = 0;
    cssObj.scale.set(scale, scale, scale);
    obj.add(cssObj);

    const material = new THREE.MeshPhongMaterial({
      opacity: 0.15,
      color: new THREE.Color(0xf00),
      blending: THREE.NoBlending,
      side: THREE.DoubleSide,
    });
    const geometry = new THREE.BoxGeometry(width, height, 1);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(scale, scale, scale);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    obj.add(mesh);

    return obj;
  }
}
