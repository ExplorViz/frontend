import * as THREE from 'three';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';
import BaseMesh from '../base-mesh';

export default abstract class BoxMesh<
  TGeometry extends THREE.BufferGeometry = THREE.BufferGeometry,
  TMaterial extends THREE.Material | THREE.Material[] = THREE.Material
> extends BaseMesh<TGeometry, TMaterial> {
  layout: BoxLayout;

  constructor(
    layout: BoxLayout,
    defaultColor: THREE.Color,
    highlightingColor: THREE.Color
  ) {
    super(defaultColor, highlightingColor);

    this.layout = layout;

    // Set default dimensions to layout data
    this.height = layout.height;
    this.width = layout.width;
    this.depth = layout.depth;
  }

  get width() {
    return this.scale.x;
  }

  set width(width: number) {
    this.scale.x = width;
  }

  get height() {
    return this.scale.y;
  }

  set height(height: number) {
    this.scale.y = height;
  }

  get depth() {
    return this.scale.z;
  }

  set depth(depth: number) {
    this.scale.z = depth;
  }
}
