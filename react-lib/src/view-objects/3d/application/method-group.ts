import * as THREE from 'three';
import { Class } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { MethodMesh } from './method-mesh';

export class MethodGroup extends THREE.Group {
  isHovered: boolean;
  dataModel: Class;

  constructor(parentDataModel: Class) {
    super();
    this.isHovered = false;
    this.dataModel = parentDataModel;
  }

  getModelId() {
    return this.dataModel.name + 'MethodMesh';
  }

  showMethods(parentGeo: THREE.BoxGeometry, parentLayout: BoxLayout) {
    const functionSeparation: Array<number> = [];
    this.dataModel.methods.forEach(() => {
      // Add each method with a default LOC of 1
      functionSeparation.push(1);
    });

    let yPos = 0; // Increases with each new mesh
    let rNumber = 128;
    let gNumber = 16;
    let bNumber = 32;

    for (let index = 0; index < functionSeparation.length; index++) {
      const element = functionSeparation[index];
      const functionHeight =
        (parentGeo.parameters.height /
          functionSeparation.reduce((sum, current) => sum + current, 0)) *
        element;

      // Compute geometry with width and height
      const box = new THREE.BoxGeometry(
        parentLayout.width / 4,
        functionHeight,
        parentLayout.depth / 4
      );

      // Compute material and colors for method mesh
      const boxMaterial = new THREE.MeshBasicMaterial();
      const maxColor = Math.max(rNumber, gNumber, bNumber);
      const minColor = Math.min(rNumber, gNumber, bNumber);
      const heighColor = maxColor + minColor;
      rNumber = Math.abs(heighColor - rNumber) % 255;
      gNumber =
        heighColor % 2 == 0 ? Math.abs(heighColor - gNumber) % 255 : gNumber;
      bNumber =
        heighColor % 3 == 0 ? Math.abs(heighColor - bNumber) % 255 : bNumber;
      boxMaterial.color.set(
        new THREE.Color(rNumber / 255, gNumber / 255, bNumber / 255)
      );

      // Create mesh and set its position
      const methodHeightMesh = new MethodMesh(
        box,
        boxMaterial,
        this.dataModel.methods[index]
      );
      methodHeightMesh.position.setX(methodHeightMesh.position.x - 0.7);
      methodHeightMesh.position.setY(
        -parentGeo.parameters.height / 2 + functionHeight / 2 + yPos
      );
      yPos = yPos + functionHeight;

      // Add mesh that represents method
      this.add(methodHeightMesh);
    }
  }
}
