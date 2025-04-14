import { SceneLayers } from 'explorviz-frontend/src/stores/minimap-service';
import { K8sEntity } from 'explorviz-frontend/src/utils/k8s-landscape-visualization-assembler';
import * as THREE from 'three';
import BoxMesh from 'explorviz-frontend/src/view-objects/3d/application/box-mesh';
import ComponentLabelMesh from 'explorviz-frontend/src/view-objects/3d/application/component-label-mesh';
import SemanticZoomManager from 'explorviz-frontend/src/view-objects/3d/application/utils/semantic-zoom-manager';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { getStoredNumberSetting } from 'explorviz-frontend/src/utils/settings/local-storage-settings';

export default class K8sMesh extends BoxMesh {
  geometry: THREE.BoxGeometry;

  material: THREE.MeshLambertMaterial;

  dataModel: K8sDataModel;

  opened: boolean = true;

  // Set by labeler
  private _labelMesh: ComponentLabelMesh | null = null;
  public get labelMesh(): ComponentLabelMesh | null {
    return this._labelMesh;
  }
  public set labelMesh(value: ComponentLabelMesh | null) {
    if (this._labelMesh != null) {
      SemanticZoomManager.instance.remove(this._labelMesh);
      this._labelMesh.disposeRecursively(SemanticZoomManager);
      this._labelMesh.deleteFromParent();
    }
    this._labelMesh = value;
  }

  constructor(
    layout: BoxLayout,
    dataModel: K8sDataModel,
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
    this.dataModel = dataModel;

    // Semantic Zoom preparations
    this.useOrignalAppearence(false);
    // Register multiple levels
    this.setAppearence(1, () => {});
    this.layers.enable(SceneLayers.Component);
  }

  updateLayout(layout: BoxLayout | undefined) {
    if (!layout) return;

    super.updateLayout(layout);

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

export type K8sDataModel = { id: string; name: string; type: K8sEntity };
