import { SceneLayers } from 'explorviz-frontend/services/minimap-service';
import { K8sEntity } from 'explorviz-frontend/utils/k8s-landscape-visualization-assembler';
import { getStoredNumberSetting } from 'explorviz-frontend/utils/settings/local-storage-settings';
import BoxMesh from 'explorviz-frontend/view-objects/3d/application/box-mesh';
import ComponentLabelMesh from 'explorviz-frontend/view-objects/3d/application/component-label-mesh';
import SemanticZoomManager from 'explorviz-frontend/view-objects/3d/application/utils/semantic-zoom-manager';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';
import * as THREE from 'three';

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
      this._labelMesh.disposeRecursively();
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

  updateLayout(
    layout: BoxLayout | undefined,
    offset: THREE.Vector3 = new THREE.Vector3()
  ) {
    if (!layout) return;

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

export type K8sDataModel = { id: string; name: string; type: K8sEntity };
