import { Class } from 'react-lib/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'react-lib/src/view-objects/layout-models/box-layout.ts';
import * as THREE from 'three';
import BoxMesh from 'react-lib/src/view-objects/3d/application/box-mesh.ts';
import ClazzLabelMesh from 'react-lib/src/view-objects/3d/application/clazz-label-mesh';
import { VisualizationMode } from 'explorviz-frontend/services/collaboration/local-user';
import { SceneLayers } from 'explorviz-frontend/services/minimap-service';

export default class ClazzMesh extends BoxMesh {
  geometry: THREE.BoxGeometry;

  material: THREE.MeshLambertMaterial;

  // Set by labeler
  labelMesh: ClazzLabelMesh | null = null;

  dataModel: Class;

  constructor(
    layout: BoxLayout,
    clazz: Class,
    defaultColor: THREE.Color,
    highlightingColor: THREE.Color
  ) {
    super(layout, defaultColor, highlightingColor);

    this.castShadow = true;
    this.receiveShadow = true;

    this.material = new THREE.MeshLambertMaterial({ color: defaultColor });
    this.material.transparent = true;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    this.geometry = geometry;
    this.dataModel = clazz;

    this.layers.enable(SceneLayers.Clazz);
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
}
