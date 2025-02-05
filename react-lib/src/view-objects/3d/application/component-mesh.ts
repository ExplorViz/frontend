import { Package } from 'react-lib/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'react-lib/src/view-objects/layout-models/box-layout.ts';
import * as THREE from 'three';
import BoxMesh from 'react-lib/src/view-objects/3d/application/box-mesh.ts';
import ComponentLabelMesh from 'react-lib/src/view-objects/3d/application/component-label-mesh';
import { SceneLayers } from 'explorviz-frontend/services/minimap-service';
import { getStoredNumberSetting } from 'react-lib/src/utils/settings/local-storage-settings';

export default class ComponentMesh extends BoxMesh {
  geometry: THREE.BoxGeometry;

  material: THREE.MeshLambertMaterial;

  dataModel: Package;

  opened: boolean = true;

  // Set by labeler
  labelMesh: ComponentLabelMesh | null = null;

  constructor(
    layout: BoxLayout,
    component: Package,
    defaultColor: THREE.Color,
    highlightingColor: THREE.Color
  ) {
    super(layout, defaultColor, highlightingColor);

    this.receiveShadow = true;
    this.castShadow = true;

    this.material = new THREE.MeshLambertMaterial({ color: defaultColor });
    this.material.transparent = true;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    this.geometry = geometry;
    this.dataModel = component;

    this.layers.enable(SceneLayers.Component);
  }

  updateLayout(layout: BoxLayout, offset: THREE.Vector3 = new THREE.Vector3()) {
    super.updateLayout(layout, offset);

    if (!this.opened) {
      const OPENED_HEIGHT = getStoredNumberSetting('openedComponentHeight');
      const CLOSED_HEIGHT = getStoredNumberSetting('closedComponentHeight');

      this.height = CLOSED_HEIGHT;
      this.position.y =
        this.layout.positionY + (CLOSED_HEIGHT - OPENED_HEIGHT) / 2;
    }
  }

  getModelId() {
    return this.dataModel.id;
  }
}
