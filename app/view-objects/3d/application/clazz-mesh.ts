import { Class } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';
import * as THREE from 'three';
import BoxMesh from './box-mesh';
import ClazzLabelMesh from './clazz-label-mesh';
import { VisualizationMode } from 'collaboration/services/local-user';
import SemanticZoomManager from './utils/semantic-zoom-manager';
import {
  ImmersiveView,
  ImmersiveViewMixin,
} from 'explorviz-frontend/rendering/application/immersive-view';
import { light, skylight } from 'explorviz-frontend/utils/scene';
import { OrbitControls } from 'explorviz-frontend/utils/controls/OrbitControls';

export class _ClazzMesh extends BoxMesh {
  geometry: THREE.BoxGeometry | THREE.BufferGeometry;

  material: THREE.MeshLambertMaterial | THREE.Material;

  // Set by labeler
  private _labelMesh: ClazzLabelMesh | null = null;
  public get labelMesh(): ClazzLabelMesh | null {
    return this._labelMesh;
  }
  public set labelMesh(value: ClazzLabelMesh | null) {
    if (this._labelMesh != null) {
      SemanticZoomManager.instance.remove(this._labelMesh);
      this._labelMesh.disposeRecursively();
      this._labelMesh.deleteFromParent();
    }
    this._labelMesh = value;
  }

  dataModel: Class;

  _original_layout: BoxLayout;

  constructor(
    layout: BoxLayout,
    clazz: Class,
    defaultColor: THREE.Color,
    highlightingColor: THREE.Color
  ) {
    const tmpLayout = layout.copy();
    tmpLayout.height = 1;
    super(tmpLayout, defaultColor, highlightingColor);

    this._original_layout = layout;
    this.castShadow = true;
    this.receiveShadow = true;

    this.material = new THREE.MeshLambertMaterial({ color: defaultColor });
    this.material.transparent = true;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    this.geometry = geometry;
    this.dataModel = clazz;

    // Semantic Zoom preparations
    this.saveOriginalAppearence();
    // Register multiple levels
    this.setAppearence(2, this.setHeightAccordingToClassSize);
    this.setAppearence(3, this.showMethodMesh);
  }

  getModelId() {
    return this.dataModel.id;
  }

  applyHoverEffect(arg?: VisualizationMode | number): void {
    if (arg === 'vr' && this.isHovered === false) {
      this.scaleAll = 3;
      super.applyHoverEffect();
    } else if (typeof arg === 'number' && this.isHovered === false) {
      super.applyHoverEffect(arg);
    } else if (this.isHovered === false) {
      super.applyHoverEffect();
    }
  }

  resetHoverEffect(mode?: VisualizationMode): void {
    if (this.isHovered) {
      super.resetHoverEffect();
      if (mode === 'vr') {
        this.scaleAll = -3;
      }
    }
  }

  setHeightAccordingToClassSize = () => {
    if (this.geometry == undefined) return;

    // Scale Position Fix
    this.position.y =
      this.position.y -
      (this.geometry.parameters.height / 2) * this.height +
      this._original_layout.height / 2;
    this.height = this._original_layout.height;
  };

  showMethodMesh = () => {
    // Add Methods lengths
    // Example with 3 Function
    // Function 1 -> 33 Line of Code
    // Function 2 -> 67 LOC
    // Function 3 -> 12 LOC
    if (!this.geometry) return;
    const functionSeperation: Array<number> = [];
    this.dataModel.methods.forEach(() => {
      // Add each method with a default loc of 1
      functionSeperation.push(1);
    });

    let runningHeight = 0;
    let rNumber = 128;
    let gNumber = 16;
    let bNumber = 32;
    for (let index = 0; index < functionSeperation.length; index++) {
      const element = functionSeperation[index];
      const functionHeight =
        (this.geometry.parameters.height /
          functionSeperation.reduce((sum, current) => sum + current, 0)) *
        element;
      const box = new THREE.BoxGeometry(
        this.layout.width / 4,
        functionHeight,
        this.layout.depth / 4
      );
      const boxmaterial = new THREE.MeshBasicMaterial();
      const maxColor = Math.max(rNumber, gNumber, bNumber);
      const minColor = Math.min(rNumber, gNumber, bNumber);
      const heighColor = maxColor + minColor;
      rNumber = Math.abs(heighColor - rNumber) % 255;
      gNumber =
        heighColor % 2 == 0 ? Math.abs(heighColor - gNumber) % 255 : gNumber;
      bNumber =
        heighColor % 3 == 0 ? Math.abs(heighColor - bNumber) % 255 : bNumber;
      boxmaterial.color.set(
        new THREE.Color(rNumber / 255, gNumber / 255, bNumber / 255)
      );

      const methodHeightMesh = new THREE.Mesh(box, boxmaterial);
      methodHeightMesh.position.setX(methodHeightMesh.position.x - 0.7);
      methodHeightMesh.position.setY(
        -this.geometry.parameters.height / 2 +
          functionHeight / 2 +
          runningHeight
      );

      runningHeight = runningHeight + functionHeight;
      // Add each MethodeDisplaying Mesh
      //appearenceMethodProportion.addMesh(methodHeightMesh, false);
      this.add(methodHeightMesh);
    }
  };
  /**
   * It overrides the enterImmersiveView function of the ImmersiveViewMixin.
   * It recieves the parameters of the Camera and Scene. It can alter anything that is necessary
   * Uses a sphere around the User and places information around the invisble sphere, such that the user
   * does not need to move but rotate the camera.
   * It has to register the exit command `ImmersiveView.instance.exitObject(this)`
   * @param camera THREE.Camera
   * @param scene THREE.Scene -> can be altered
   */
  enterImmersiveView = (camera: THREE.Camera, scene: THREE.Scene) => {
    // Register Exit command
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        ImmersiveView.instance.exitObject(this);
        // TODO fix Remove of the Listener
        document.removeEventListener('keydown', this);
      }
    });
    //ImmersiveView.instance.exitObject(this);

    //(camera as OrbitControls).enablePan = false;

    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(skylight());
    scene.add(light());
    // White Background!
    scene.background = new THREE.Color(1, 1, 1);
    scene.add(cube);

    //https://dustinpfister.github.io/2021/05/14/threejs-examples-position-things-to-sphere-surface/
    // Use of Euler to position/rotate objects around a sphere.

    // Create invisible "sphere".
    this.positionInSphereRadius(
      camera.position,
      1,
      0,
      0,
      cube.scale.x / 2,
      cube
    );
    const sphere1 = new THREE.Mesh(
      new THREE.SphereGeometry(1, 15, 15),
      new THREE.MeshNormalMaterial({ wireframe: true })
    );
    // camera.updateMatrixWorld();
    // const vector = camera.position.clone();
    // console.log('Lokal Camera: ');
    // console.log(vector);
    // //vector.applyMatrix4(camera.matrixWorld);
    // camera.localToWorld(vector);
    // console.log('World Camera: ');
    // console.log(vector);
    sphere1.position.copy(camera.position);
    //sphere1.rotation.copy(camera.rotation);
    //sphere1.position.add(vector);
    //console.log('Local Sphere: ');
    //console.log(sphere1.position);
    scene.add(sphere1);
    const gridHelper = new THREE.GridHelper(100, 10);
    scene.add(gridHelper);
  };

  positionInSphereRadius(
    centerOfShpere: THREE.Vector3,
    radiusOfSphere: number,
    lat: number,
    long: number,
    alt: number,
    mesh: THREE.Mesh
  ) {
    // const v1 = new THREE.Vector3(0, radiusOfSphere + alt, 0);
    // const x = Math.PI * lat;
    // const z = Math.PI * 2 * long;
    // const e1 = new THREE.Euler(x, 0, z);
    // mesh.position.copy(centerOfShpere).add(v1).applyEuler(e1);

    // const radian = Math.PI * -0.5 + Math.PI * lat;
    // const x = Math.cos(radian) * radiusOfSphere;
    // const y = Math.sin(radian) * radiusOfSphere;
    // mesh.position.set(x, y, 0);
    // // set long
    // mesh.rotation.y = Math.PI * 2 * long;

    // https://discourse.threejs.org/t/orientation-of-objects-on-a-sphere-surface/28220/3
    //set on sphere
    const randPhi = Math.random() * Math.PI * 1 - Math.PI / 2; //horiz, subtract Math.PI/2 so only in top half of sphere
    const randTheta = Math.random() * Math.PI * 1 - Math.PI / 2; //vert, subtract Math.PI/2 so only in top half of sphere
    mesh.position.setFromSphericalCoords(radiusOfSphere, randPhi, randTheta);
    mesh.position.add(centerOfShpere);
    mesh.position.y += alt; //move down to align with sphere offset

    //align on sphere
    const vectorToPointOnSphere = new THREE.Vector3();
    const sphericalCoord = new THREE.Spherical(
      radiusOfSphere,
      randPhi,
      randTheta
    );
    vectorToPointOnSphere.setFromSpherical(sphericalCoord);
    const originalOrientation = new THREE.Vector3(0, 1, 0);
    mesh.quaternion.setFromUnitVectors(
      originalOrientation,
      vectorToPointOnSphere.normalize()
    );
  }
}

export default class ClazzMesh extends ImmersiveViewMixin(_ClazzMesh) {
  constructor(
    layout: BoxLayout,
    clazz: Class,
    defaultColor: THREE.Color,
    highlightingColor: THREE.Color
  ) {
    super(layout, clazz, defaultColor, highlightingColor);
  }
}
