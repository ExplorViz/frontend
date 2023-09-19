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

  scene: THREE.Scene;

  renderer: THREE.WebGLRenderer;

  cssRenderer: CSS3DRenderer;

  updatables: any[];

  zoomHandler?: ArZoomHandler;

  constructor(owner: any, args: Args) {
    setOwner(this, owner);
    this.camera = args.camera;
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
      this.renderer.render(this.scene, this.camera);
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
    const root = new THREE.Object3D();
    root.position.y = 20;
    root.rotation.y = Math.PI / 3;
    this.scene.add(root);

    const background = this.makeElementObject('div', 200, 200);
    background.userData.css3dObject.element.textContent =
      'I am a <div> element intersecting a WebGL sphere.\n\nThis text is editable!';
    background.userData.css3dObject.element.setAttribute('contenteditable', '');
    background.position.z = 20;
    background.userData.css3dObject.element.style.opacity = '1';
    background.userData.css3dObject.element.style.padding = '10px';
    const color1 = '#7bb38d';
    const color2 = '#71a381';
    background.userData.css3dObject.element.style.background = `repeating-linear-gradient(
        45deg,
        ${color1},
        ${color1} 10px,
        ${color2} 10px,
        ${color2} 20px
    )`;
    root.add(background);

    const button = this.makeElementObject('button', 75, 20);
    button.userData.css3dObject.element.style.border = '2px solid #fa5a85';
    button.userData.css3dObject.element.textContent = 'Click me!';
    button.userData.css3dObject.element.addEventListener('click', () =>
      alert('You clicked a <button> element in the DOM!')
    );
    button.position.y = 10;
    button.position.z = 10;
    button.userData.css3dObject.element.style.background = '#e64e77';
    background.add(button);

    // make a geometry that we will clip with the DOM elememt.
    ~(function makeGeometry() {
      const material = new THREE.MeshPhongMaterial({
        color: 0x991d65,
        emissive: 0x000000,
        specular: 0x111111,
        side: THREE.DoubleSide,
        flatShading: false,
        shininess: 30,
        vertexColors: true,
      });

      const geometry = new THREE.SphereGeometry(70, 32, 32);

      const position = geometry.attributes.position;
      const colors = [];

      const color = new THREE.Color();
      for (let i = 0, l = position.count; i < l; i++) {
        color.setHSL(
          Math.random() * 0.2 + 0.5,
          0.75,
          Math.random() * 0.15 + 0.85
        );
        colors.push(color.r, color.g, color.b);
      }

      geometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(colors, 3)
      );
      // }}

      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.z = 20;
      sphere.position.y = -100;
      sphere.castShadow = true;
      sphere.receiveShadow = false;
      root.add(sphere);
    })();

    // document.querySelector('#css')!.appendChild(this.cssRenderer.domElement);
  }

  makeElementObject(type: any, width: number, height: number) {
    const obj = new THREE.Object3D();

    const element = document.createElement(type);
    element.style.width = width + 'px';
    element.style.height = height + 'px';
    element.style.opacity = 0.999;
    element.style.boxSizing = 'border-box';

    const css3dObject = new CSS3DObject(element);
    obj.userData.css3dObject = css3dObject;
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
}
