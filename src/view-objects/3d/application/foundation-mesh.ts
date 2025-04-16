import { Application } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import * as THREE from 'three';
import BoxMesh from 'explorviz-frontend/src/view-objects/3d/application/box-mesh.ts';
import ComponentLabelMesh from 'explorviz-frontend/src/view-objects/3d/application/component-label-mesh';
import MinimapLabelMesh from 'explorviz-frontend/src/view-objects/3d/application/minimap-label-mesh';
import { SceneLayers } from 'explorviz-frontend/src/stores/minimap-service';
import SemanticZoomManager from 'explorviz-frontend/src/view-objects/3d/application/utils/semantic-zoom-manager';
import { extend, ThreeElement } from '@react-three/fiber';

interface Args {
  foundation: Application;
}

export default class FoundationMesh<
  TGeometry extends THREE.BufferGeometry = THREE.BufferGeometry,
  TMaterial extends THREE.Material | THREE.Material[] = THREE.Material,
> extends BoxMesh<TGeometry, TMaterial> {
  geometry: any;
  material: any;

  dataModel: Application;

  labelMesh: ComponentLabelMesh | null = null;
  minimapLabelMesh: MinimapLabelMesh | null = null;

  constructor({ foundation }: Args) {
    super();

    this.receiveShadow = true;

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    this.geometry = geometry;
    this.material = new THREE.MeshLambertMaterial({ color: this.defaultColor });
    this.material.needsUpdate = true;
    this.dataModel = foundation;

    this.layers.enable(SceneLayers.Foundation);

    // Semantic Zoom
    this.saveOriginalAppearence();
    SemanticZoomManager.instance.add(this);
  }

  getModelId() {
    return this.dataModel.id;
  }
}

extend({ FoundationMesh });

// Add types to ThreeElements elements so primitives pick up on it
declare module '@react-three/fiber' {
  interface ThreeElements {
    foundationMesh: ThreeElement<typeof FoundationMesh>;
  }
}
