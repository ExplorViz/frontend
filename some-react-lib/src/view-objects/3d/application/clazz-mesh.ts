import { Class } from 'some-react-lib/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'some-react-lib/src/view-objects/layout-models/box-layout';
import * as THREE from 'three';
import BoxMesh from 'some-react-lib/src/view-objects/3d/application/box-mesh';
import ClazzLabelMesh from 'some-react-lib/src/view-objects/3d/application/clazz-label-mesh';
/* import { VisualizationMode } from 'collaborative-mode/services/local-user'; */

/* type copied from local-user service. Delete once it is migrated */
export type VisualizationMode = 'browser' | 'ar' | 'vr';

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
