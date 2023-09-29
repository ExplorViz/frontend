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

    // const position = layout.center;
    // position.y += 1.5 - 0.5 * layout.height + 0.01;
    // position.x -= 0.5 * layout.width - 0.25 * LABEL_HEIGHT;
    // this.labelMesh2.position.copy(position);
    // const scale = new THREE.Vector3(0.5 * LABEL_HEIGHT, 1.0, 0.9 * layout.depth);
    // scale.multiplyScalar(0.01);
    // this.labelMesh2.scale.copy(scale);

    this.add(this.labelMesh);

    // console.log('layout', layout.center);
    // console.log(
    //   'label position',
    //   this.labelMesh2.getWorldPosition(new THREE.Vector3()),
    //   this.getWorldPosition(new THREE.Vector3())
    // );
    // console.log(
    //   'label scale',
    //   this.labelMesh2.getWorldScale(new THREE.Vector3()),
    //   this.getWorldScale(new THREE.Vector3())
    // );
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
