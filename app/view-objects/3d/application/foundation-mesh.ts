import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';
import * as THREE from 'three';
import BoxMesh from './box-mesh';
import { createSingleLabelMesh } from './utils/single-label-mesh';
import ApplicationData from 'explorviz-frontend/utils/application-data';
import type { ApplicationColors } from 'explorviz-frontend/services/configuration';

const geometry = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
export default class FoundationMesh<
  TGeometry extends THREE.BufferGeometry = THREE.BufferGeometry,
  TMaterial extends THREE.Material | THREE.Material[] = THREE.Material,
> extends BoxMesh<TGeometry, TMaterial> {
  geometry: any;
  material: any;

  dataModel: Application;

  labelMesh: THREE.Mesh;

  constructor(
    layout: BoxLayout,
    foundation: Application,
    data: ApplicationData,
    colors: ApplicationColors,
    texture: THREE.Texture
  ) {
    super(layout, colors.foundationColor, colors.highlightedEntityColor);

    this.receiveShadow = true;

    this.geometry = geometry;
    this.setDefaultMaterial();
    this.dataModel = foundation;

    // TODO: labeler.ts
    this.labelMesh = createSingleLabelMesh(
      texture,
      data.labels.layout.get(foundation.id)!,
      colors.foundationTextColor
    );

    const foundationOffset = 1.5;

    // Set y-position just above the box of the parent mesh
    this.labelMesh.position.y = this.geometry.parameters.height / 2 + 0.01;

    // Align text with component parent
    this.labelMesh.rotation.x = -(Math.PI / 2);
    this.labelMesh.rotation.z = -(Math.PI / 2);

    this.labelMesh.position.x =
      -this.geometry.parameters.width / 2 + foundationOffset / this.width;

    this.add(this.labelMesh);
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
