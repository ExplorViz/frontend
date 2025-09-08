import { Package } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout.ts';
import * as THREE from 'three';
import BoxMesh from 'explorviz-frontend/src/view-objects/3d/application/box-mesh.ts';
import ComponentLabelMesh from 'explorviz-frontend/src/view-objects/3d/application/component-label-mesh';
import { SceneLayers } from 'explorviz-frontend/src/stores/minimap-service';
import { getStoredNumberSetting } from 'explorviz-frontend/src/utils/settings/local-storage-settings';
import { positionBoxLabel } from 'explorviz-frontend/src/utils/application-rendering/labeler';
import ApplicationObject3D from './application-object-3d';
import { extend, ThreeElement } from '@react-three/fiber';

interface Args {
  component: Package;
}
export default class ComponentMesh extends BoxMesh {
  geometry: THREE.BoxGeometry;

  material: THREE.MeshLambertMaterial;

  dataModel: Package;

  _opened: boolean = true;

  public get opened(): boolean {
    return this._opened;
  }
  public set opened(value: boolean) {
    this._opened = value;
  }

  // Set by labeler
  private _labelMesh: ComponentLabelMesh | null = null;
  public get labelMesh(): ComponentLabelMesh | null {
    return this._labelMesh;
  }

  public set labelMesh(value: ComponentLabelMesh | null) {
    if (this._labelMesh != null) {
      this._labelMesh.disposeRecursively();
      this._labelMesh.deleteFromParent();
    }
    this._labelMesh = value;
  }

  constructor({ component }: Args) {
    super();
    this.receiveShadow = true;
    this.castShadow = true;

    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.material = new THREE.MeshLambertMaterial({ color: this.defaultColor });
    this.material.transparent = true;
    this.dataModel = component;

    this.layers.enable(SceneLayers.Component);
  }

  updateLayout(layout: BoxLayout) {
    const aspectRatioChanged = this.layout.aspectRatio != layout.aspectRatio;
    super.updateLayout(layout);

    // Avoid distorted text by recomputing text geometry
    if (aspectRatioChanged && this.labelMesh) {
      this.labelMesh.scale.set(1, 1, 1);
      this.labelMesh.computeLabel(this);
      positionBoxLabel(this);
    }

    if (!this.opened && this.parent instanceof ApplicationObject3D) {
      const CLOSED_COMPONENT_HEIGHT = getStoredNumberSetting(
        'closedComponentHeight'
      );

      this.height = CLOSED_COMPONENT_HEIGHT;

      // TODO: Check if this is still correct
      this.position.y =
        this.layout.positionY +
        CLOSED_COMPONENT_HEIGHT / 2 -
        this.parent.layout.positionY;
    }
  }

  getModelId() {
    return this.dataModel.id;
  }
}

extend({ ComponentMesh });

// Add types to ThreeElements elements so primitives pick up on it
declare module '@react-three/fiber' {
  interface ThreeElements {
    componentMesh: ThreeElement<typeof ComponentMesh>;
  }
}
