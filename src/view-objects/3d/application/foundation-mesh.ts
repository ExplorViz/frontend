import { Application } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout.ts';
import * as THREE from 'three';
import BoxMesh from 'explorviz-frontend/src/view-objects/3d/application/box-mesh.ts';
import ComponentLabelMesh from 'explorviz-frontend/src/view-objects/3d/application/component-label-mesh';
import MinimapLabelMesh from 'explorviz-frontend/src/view-objects/3d/application/minimap-label-mesh';
import { SceneLayers } from 'explorviz-frontend/src/stores/minimap-service';
import SemanticZoomManager from 'explorviz-frontend/src/view-objects/3d/application/utils/semantic-zoom-manager';

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

    // Semantic Zoom
    this.saveOriginalAppearence();
    SemanticZoomManager.instance.add(this);
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
