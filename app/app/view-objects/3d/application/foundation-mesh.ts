import { Application } from 'react-lib/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'react-lib/src/view-objects/layout-models/box-layout.ts';
import * as THREE from 'three';
import BoxMesh from './box-mesh';
import ComponentLabelMesh from './component-label-mesh';
import MinimapLabelMesh from './minimap-label-mesh';
import { SceneLayers } from 'explorviz-frontend/services/minimap-service';

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

    this.layers.enable(SceneLayers.Foundation);
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
