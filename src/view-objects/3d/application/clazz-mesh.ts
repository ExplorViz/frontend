import { Class } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout.ts';
import * as THREE from 'three';
import BoxMesh from 'explorviz-frontend/src/view-objects/3d/application/box-mesh.ts';
import ClazzLabelMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-label-mesh';
import SemanticZoomManager from './utils/semantic-zoom-manager';
import {
  ImmersiveView,
  ImmersiveViewMixin,
} from 'explorviz-frontend/src/rendering/application/immersive-view';
import gsap from 'gsap';
import ImmsersiveClassScene from 'explorviz-frontend/src/utils/class-immersive-scene';
import { MethodGroup } from './method-group';
import { VisualizationMode } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { SceneLayers } from 'explorviz-frontend/src/stores/minimap-service';
import { extend, ThreeElement } from '@react-three/fiber';

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
      this._labelMesh.disposeRecursively(SemanticZoomManager);
      this._labelMesh.deleteFromParent();
    }
    this._labelMesh = value;
  }

  dataModel: Class;

  _original_layout: BoxLayout;
  currentMethodMesh: MethodGroup | undefined;

  // Immersive View
  private zoomOutCounter: number = 0;
  private lastExecution: number = 0;

  constructor(
    layout: BoxLayout,
    clazz: Class,
    defaultColor: THREE.Color,
    highlightingColor: THREE.Color
  ) {
    super(layout, defaultColor, highlightingColor);

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
    this.currentMethodMesh = undefined;
    // Register multiple levels
    this.setAppearence(2, this.setHeightAccordingToClassSize);
    this.setAppearence(3, this.showMethodMesh);

    // Immersive View
    this.layers.enable(SceneLayers.Clazz);
  }

  getModelId() {
    return this.dataModel.id;
  }

  applyHoverEffect(arg?: VisualizationMode | number): void {
    if (arg === 'vr' && !this.isHovered) {
      this.scaleAll = 3;
      super.applyHoverEffect();
    } else if (typeof arg === 'number' && !this.isHovered) {
      super.applyHoverEffect(arg);
    } else if (!this.isHovered) {
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
    if (!(this.geometry instanceof THREE.BoxGeometry)) return;

    // Scale Position Fix
    this.position.y =
      this.position.y -
      (this.geometry.parameters.height / 2) * this.height +
      this._original_layout.height / 2;
    this.height = this._original_layout.height;
  };

  showMethodMesh = () => {
    if (!(this.geometry instanceof THREE.BoxGeometry)) return;

    this.currentMethodMesh = new MethodGroup(this.dataModel);
    this.currentMethodMesh.showMethods(this.geometry, this.layout);
    this.add(this.currentMethodMesh);
  };

  callBeforeAppearenceZero = (currentMesh: THREE.Mesh | undefined) => {
    void currentMesh;
    if (this.currentMethodMesh == undefined) return;
    this.remove(this.currentMethodMesh);
    //this.currentMethodMesh.decompose();
  };

  /**
   * It overrides the enterImmersiveView function of the ImmersiveViewMixin.
   * It receives the parameters of the Camera and Scene. It can alter anything that is necessary
   * Uses a sphere around the User and places information around the invisible sphere, such that the user
   * does not need to move but rotate the camera.
   * It has to register the exit command `ImmersiveView.instance.exitObject(this)`
   * @param camera THREE.Camera
   * @param scene THREE.Scene -> can be altered
   */
  enterImmersiveView = (camera: THREE.Camera, scene: THREE.Scene) => {
    // Register Exit command via escape key
    this.addEventListenerToExitOnEscapeKey();

    // Register exit when zooming out
    this.addEventListenerToExitWhenScrollingOut();

    // Register Exit when camera is at minimum zoom level

    // TODO: This might be activated by addident
    // this.addEventListenerToExitWhenMinZoomLevelReached();

    // Apply Data to new Scene
    const immersiveClassScene = new ImmsersiveClassScene(this.dataModel, scene);

    immersiveClassScene.fillScene(camera);
    // Add grid for development purposes
    // const gridHelper = new THREE.GridHelper(100, 10);
    // scene.add(gridHelper);
    // Add Axis for development purposes
    //const axisHelper = new THREE.AxesHelper();
    //scene.add(axisHelper);
  };
  addEventListenerToExitOnEscapeKey = () => {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        ImmersiveView.instance.exitObject(this);
      }
    });
  };

  addEventListenerToExitWhenScrollingOut = () => {
    ImmersiveView.instance.currentCameraControl?.domElement.addEventListener(
      'wheel',
      (event: any) => {
        // break when zooming in
        if (event.deltaY < 0) return;
        // continue when zooming out
        ImmersiveView.instance.currentCameraControl?.domElement.removeEventListener(
          'wheel',
          this
        );
        ImmersiveView.instance.exitObject(this);
      }
    );
  };
  addEventListenerToExitWhenMinZoomLevelReached = () => {
    ImmersiveView.instance.currentCameraControl?.addEventListener(
      'minzoomreached',
      () => {
        // // break when zooming in
        // if (event.deltaY < 0) return;
        // // continue when zooming out
        // ImmersiveView.instance.currentCameraControl?.domElement.removeEventListener(
        //   'wheel',
        //   this
        // );

        const currentTime = Date.now(); // Get the current timestamp in milliseconds
        //console.log('minzoomreached');
        if (currentTime - this.lastExecution > 700) {
          // Check if more than 1.5 second has passed
          //console.log('minzoomreached - less than a second ago');
          this.zoomOutCounter += 1;
          if (this.zoomOutCounter > 1) {
            this.zoomOutCounter = 0;
            ImmersiveView.instance.exitObject(this);
          }
          this.lastExecution = currentTime; // Update the last execution time
        }
        // else {
        //   console.log(
        //     'Command not executed: Less than 1 second since last call.'
        //   );
        // }
      }
    );
    ImmersiveView.instance.currentCameraControl?.addEventListener(
      'maxzoom',
      () => {
        this.zoomOutCounter = 0;
      }
    );
  };

  immersiveViewHighlight = () => {
    this.pulseAnimation();
  };
  pulseAnimation() {
    if (!(this.material instanceof THREE.MeshLambertMaterial)) return;

    const targetColor = new THREE.Color(0xff0000); // Green
    gsap.to(this.material.color, {
      r: targetColor.r,
      g: targetColor.g,
      b: targetColor.b,
      duration: 0.1,
      yoyo: true, // Reverse the animation back to the original
      repeat: 10, // Number of times the animation repeats
      ease: 'power1.inOut',
    });
  }
}

interface Args {
  layout: BoxLayout;
  clazz: Class;
  defaultColor: THREE.Color;
  highlightingColor: THREE.Color;
}

export default class ClazzMesh extends ImmersiveViewMixin(_ClazzMesh) {
  constructor({ layout, clazz, defaultColor, highlightingColor }: Args) {
    super(layout, clazz, defaultColor, highlightingColor);
  }
}

extend({ ClazzMesh });

// Add types to ThreeElements elements so primitives pick up on it
declare module '@react-three/fiber' {
  interface ThreeElements {
    clazzMesh: ThreeElement<typeof ClazzMesh>;
  }
}
