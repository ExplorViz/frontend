import { Class } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';
import * as THREE from 'three';
import BoxMesh from './box-mesh';
import ClazzLabelMesh from './clazz-label-mesh';
import { VisualizationMode } from 'collaboration/services/local-user';

export default class ClazzMesh extends BoxMesh {
  geometry: THREE.BoxGeometry | THREE.BufferGeometry;

  material: THREE.MeshLambertMaterial | THREE.Material;

  // Set by labeler
  labelMesh: ClazzLabelMesh | null = null;

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
    this.setAppearence(1, this.setHeightAccordingToClassSize);
    this.setAppearence(2, this.showMethodMesh);
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
}
