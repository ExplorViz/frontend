import { Class } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';
import * as THREE from 'three';
import BoxMesh from './box-mesh';
import ClazzLabelMesh from './clazz-label-mesh';

export default class ClazzMesh extends BoxMesh {
  geometry: THREE.BoxGeometry;

  material: THREE.MeshLambertMaterial;

  // Set by labeler
  labelMesh: ClazzLabelMesh | null = null;

  dataModel: Class;

  constructor(layout: BoxLayout, clazz: Class, defaultColor: THREE.Color,
    highlightingColor: THREE.Color) {
    super(layout, defaultColor, highlightingColor);

    this.castShadow = true;
    this.receiveShadow = true;

    this.material = new THREE.MeshLambertMaterial({ color: defaultColor });
    this.material.transparent = true;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    this.geometry = geometry;
    this.dataModel = clazz;
  }
}
