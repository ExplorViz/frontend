import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';
import * as THREE from 'three';
import BoxMesh from './box-mesh';
import ComponentLabelMesh from './component-label-mesh';
import MinimapLabelMesh from './minimap-label-mesh';

export default class FoundationMesh<
  TGeometry extends THREE.BufferGeometry = THREE.BufferGeometry,
  TMaterial extends THREE.Material | THREE.Material[] = THREE.Material,
> extends BoxMesh<TGeometry, TMaterial> {
  geometry: any;
  material: any;

  dataModel: Application;

  labelMesh: ComponentLabelMesh | null = null;
  minimapLabelMesh: MinimapLabelMesh | null = null;

  constructor(
    layout: BoxLayout,
    foundation: Application,
    defaultColor: THREE.Color,
    highlightingColor: THREE.Color
  ) {
    super(layout, defaultColor, highlightingColor);

    this.receiveShadow = true;

    const geometry = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
    this.geometry = geometry;
    this.setDefaultMaterial();
    this.dataModel = foundation;
  }

  setDefaultMaterial() {
    const material = new THREE.MeshLambertMaterial({
      color: this.defaultColor,
    });
    this.material = material;
  }

  getModelId() {
    return this.dataModel.id;
  }
}
