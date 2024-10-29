import * as THREE from 'three';
import {
  Method,
  Class,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';
import { VisualizationMode } from 'collaboration/services/local-user';

// export class MethodMesh extends BoxMesh {
//   geometry: THREE.BoxGeometry | THREE.BufferGeometry;
//   material: THREE.MeshLambertMaterial | THREE.Material;
//   dataModel: Class;

//   constructor(
//     layout: BoxLayout,
//     clazz: Class,
//     defaultColor: THREE.Color,
//     highlightingColor: THREE.Color
//   ) {
//     super(layout, defaultColor, highlightingColor);
//     this.dataModel = clazz;
//     this.material = new THREE.MeshLambertMaterial({ color: defaultColor });
//     this.material.transparent = true;
//     const geometry = new THREE.BoxGeometry(1, 1, 1);
//     this.geometry = geometry;
//   }

//   showMethods(parentGeo: THREE.BufferGeometry) {
//     const functionSeperation: Array<number> = [];
//     this.dataModel.methods.forEach(() => {
//       // Add each method with a default loc of 1
//       functionSeperation.push(1);
//     });

//     let runningHeight = 0;
//     let rNumber = 128;
//     let gNumber = 16;
//     let bNumber = 32;
//     for (let index = 0; index < functionSeperation.length; index++) {
//       const element = functionSeperation[index];
//       const functionHeight =
//         (parentGeo.parameters.height /
//           functionSeperation.reduce((sum, current) => sum + current, 0)) *
//         element;
//       const box = new THREE.BoxGeometry(
//         this.layout.width / 4,
//         functionHeight,
//         this.layout.depth / 4
//       );
//       const boxmaterial = new THREE.MeshBasicMaterial();
//       const maxColor = Math.max(rNumber, gNumber, bNumber);
//       const minColor = Math.min(rNumber, gNumber, bNumber);
//       const heighColor = maxColor + minColor;
//       rNumber = Math.abs(heighColor - rNumber) % 255;
//       gNumber =
//         heighColor % 2 == 0 ? Math.abs(heighColor - gNumber) % 255 : gNumber;
//       bNumber =
//         heighColor % 3 == 0 ? Math.abs(heighColor - bNumber) % 255 : bNumber;
//       boxmaterial.color.set(
//         new THREE.Color(rNumber / 255, gNumber / 255, bNumber / 255)
//       );

//       const methodHeightMesh = new THREE.Mesh(box, boxmaterial);
//       methodHeightMesh.position.setX(methodHeightMesh.position.x - 0.7);
//       methodHeightMesh.position.setY(
//         -parentGeo.parameters.height / 2 + functionHeight / 2 + runningHeight
//       );

//       runningHeight = runningHeight + functionHeight;
//       // Add each MethodeDisplaying Mesh
//       //appearenceMethodProportion.addMesh(methodHeightMesh, false);
//       this.add(methodHeightMesh);
//     }
//   }
// }

export class MethodMesh extends THREE.Mesh {
  dataModel: Method;
  constructor(
    geometry: THREE.Geometry | THREE.BufferGeometry = new THREE.BoxGeometry(),
    material: THREE.Material = new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
    dataModel: Method
  ) {
    super(geometry, material);
    this.dataModel = dataModel;
  }

  applyHoverEffect(arg?: VisualizationMode | number): void {
    this.parent.applyHoverEffect(arg);
  }

  resetHoverEffect(mode?: VisualizationMode): void {
    this.parent.resetHoverEffect(mode);
  }
  getModelId() {
    return 'MethodMeshIDXYZ';
  }
}
export class MethodGroupMesh extends THREE.Group {
  isHovered: boolean;
  dataModel: Class;
  constructor(parentDataModel: Class) {
    super();
    this.isHovered = false;
    this.dataModel = parentDataModel;
  }
  showMethods(parentGeo: THREE.BufferGeometry, parentlayout: BoxLayout) {
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
        (parentGeo.parameters.height /
          functionSeperation.reduce((sum, current) => sum + current, 0)) *
        element;
      const box = new THREE.BoxGeometry(
        parentlayout.width / 4,
        functionHeight,
        parentlayout.depth / 4
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

      const methodHeightMesh = new MethodMesh(
        box,
        boxmaterial,
        this.dataModel.methods[index]
      );
      methodHeightMesh.position.setX(methodHeightMesh.position.x - 0.7);
      methodHeightMesh.position.setY(
        -parentGeo.parameters.height / 2 + functionHeight / 2 + runningHeight
      );
      runningHeight = runningHeight + functionHeight;
      // Add each MethodeDisplaying Mesh
      //appearenceMethodProportion.addMesh(methodHeightMesh, false);
      this.add(methodHeightMesh);
    }
  }

  applyHoverEffect(arg?: VisualizationMode | number): void {
    //this.debug('You are hovering a MethodMeshGroup');
  }

  resetHoverEffect(mode?: VisualizationMode): void {
    //this.debug('You are leaving a MethodMeshGroup');
  }
}

// import { Class } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
// import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';
// import * as THREE from 'three';
// import BoxMesh from './box-mesh';
// import ClazzLabelMesh from './clazz-label-mesh';
// import { VisualizationMode } from 'collaboration/services/local-user';
// import {
//   Appearence,
//   SemanticZoomableObject,
// } from './utils/semantic-zoom-manager';

// export default class MethodMesh
//   extends THREE.Group
//   implements SemanticZoomableObject
// {
//   geometry: THREE.BoxGeometry | THREE.BufferGeometry;

//   material: THREE.MeshLambertMaterial | THREE.Material;

//   constructor(
//     layout: BoxLayout,
//     clazz: Class,
//     defaultColor: THREE.Color,
//     highlightingColor: THREE.Color
//   ) {
//     const tmpLayout = layout.copy();
//     tmpLayout.height = 1;
//     super(tmpLayout, defaultColor, highlightingColor);

//     // Semantic Zoom preparations
//     this.saveOriginalAppearence();
//     // Register multiple levels
//     this.setAppearence(1, this.setHeightAccordingToClassSize);
//     this.setAppearence(2, this.showMethodMesh);
//   }
//   callBeforeAppearenceAboveZero: (currentMesh: THREE.Mesh | undefined) => void;
//   callBeforeAppearenceZero: (currentMesh: THREE.Mesh | undefined) => void;
//   showAppearence(i: number): boolean {
//     throw new Error('Method not implemented.');
//   }
//   getCurrentAppearenceLevel(): number {
//     throw new Error('Method not implemented.');
//   }
//   setAppearence(i: number, ap: Appearence | (() => void)): void {
//     throw new Error('Method not implemented.');
//   }
//   getNumberOfLevels(): number {
//     throw new Error('Method not implemented.');
//   }
//   saveOriginalAppearence(): void {
//     throw new Error('Method not implemented.');
//   }
//   setCallBeforeAppearenceAboveZero(
//     fn: (currentMesh: THREE.Mesh | undefined) => void
//   ): void {
//     throw new Error('Method not implemented.');
//   }
//   setCallBeforeAppearenceZero(
//     fn: (currentMesh: THREE.Mesh | undefined) => void
//   ): void {
//     throw new Error('Method not implemented.');
//   }

//   applyHoverEffect(arg?: VisualizationMode | number): void {
//     if (arg === 'vr' && this.isHovered === false) {
//       this.scaleAll = 3;
//       super.applyHoverEffect();
//     } else if (typeof arg === 'number' && this.isHovered === false) {
//       super.applyHoverEffect(arg);
//     } else if (this.isHovered === false) {
//       super.applyHoverEffect();
//     }
//   }

//   resetHoverEffect(mode?: VisualizationMode): void {
//     if (this.isHovered) {
//       super.resetHoverEffect();
//       if (mode === 'vr') {
//         this.scaleAll = -3;
//       }
//     }
//   }

//   showMethodMesh = () => {
//     // Add Methods lengths
//     // Example with 3 Function
//     // Function 1 -> 33 Line of Code
//     // Function 2 -> 67 LOC
//     // Function 3 -> 12 LOC
//     if (!this.geometry) return;
//     const functionSeperation: Array<number> = [];
//     this.dataModel.methods.forEach(() => {
//       // Add each method with a default loc of 1
//       functionSeperation.push(1);
//     });

//     let runningHeight = 0;
//     let rNumber = 128;
//     let gNumber = 16;
//     let bNumber = 32;
//     for (let index = 0; index < functionSeperation.length; index++) {
//       const element = functionSeperation[index];
//       const functionHeight =
//         (this.geometry.parameters.height /
//           functionSeperation.reduce((sum, current) => sum + current, 0)) *
//         element;
//       const box = new THREE.BoxGeometry(
//         this.layout.width / 4,
//         functionHeight,
//         this.layout.depth / 4
//       );
//       const boxmaterial = new THREE.MeshBasicMaterial();
//       const maxColor = Math.max(rNumber, gNumber, bNumber);
//       const minColor = Math.min(rNumber, gNumber, bNumber);
//       const heighColor = maxColor + minColor;
//       rNumber = Math.abs(heighColor - rNumber) % 255;
//       gNumber =
//         heighColor % 2 == 0 ? Math.abs(heighColor - gNumber) % 255 : gNumber;
//       bNumber =
//         heighColor % 3 == 0 ? Math.abs(heighColor - bNumber) % 255 : bNumber;
//       boxmaterial.color.set(
//         new THREE.Color(rNumber / 255, gNumber / 255, bNumber / 255)
//       );

//       const methodHeightMesh = new THREE.Mesh(box, boxmaterial);
//       methodHeightMesh.position.setX(methodHeightMesh.position.x - 0.7);
//       methodHeightMesh.position.setY(
//         -this.geometry.parameters.height / 2 +
//           functionHeight / 2 +
//           runningHeight
//       );

//       runningHeight = runningHeight + functionHeight;
//       // Add each MethodeDisplaying Mesh
//       //appearenceMethodProportion.addMesh(methodHeightMesh, false);
//       this.add(methodHeightMesh);
//     }
//   };
// }
